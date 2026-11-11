import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import type { User } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/appError.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { isUniqueConstraintError } from '../../lib/prismaErrors.js';
import { DEFAULT_CATEGORIES } from '../categories/defaultCategories.js';
import type { LoginInput, RegisterInput, UserDto } from './auth.schemas.js';

const REFRESH_TOKEN_BYTES = 48;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const REFRESH_REUSE_GRACE_MS = 10_000;

export const REFRESH_TOKEN_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY;

export interface Session {
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

function toUserDto(user: User): UserDto {
  return { id: user.id, email: user.email, name: user.name };
}

// Solo se guarda el hash: si se filtra la base, los refresh tokens no sirven.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return token;
}

async function createSession(user: User): Promise<Session> {
  return {
    user: toUserDto(user),
    accessToken: signAccessToken(user.id),
    refreshToken: await issueRefreshToken(user.id),
  };
}

/** Crea el usuario con sus categorías por defecto y abre una sesión. */
export async function register(input: RegisterInput): Promise<Session> {
  const data = {
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
    categories: { create: [...DEFAULT_CATEGORIES] },
  };
  try {
    // Sin consulta previa: el índice único es lo que garantiza un solo usuario por correo
    // cuando llegan dos registros iguales a la vez.
    return await createSession(await prisma.user.create({ data }));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError('CONFLICT', 'Ya existe una cuenta con ese correo');
    }
    throw error;
  }
}

/** Abre una sesión si las credenciales son correctas. */
export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const isValid = user !== null && (await verifyPassword(input.password, user.passwordHash));
  // Mismo mensaje para correo inexistente y contraseña incorrecta: no revela qué cuentas existen.
  if (!isValid) throw new AppError('UNAUTHORIZED', 'Correo o contraseña incorrectos');

  return createSession(user);
}

/**
 * Rota el refresh token: revoca el recibido y emite una sesión nueva.
 * Si llega un token revocado hace más de `REFRESH_REUSE_GRACE_MS` se asume robo
 * y se revocan todos los del usuario.
 */
export async function refresh(refreshToken: string | undefined): Promise<Session> {
  const invalid = new AppError('UNAUTHORIZED', 'Sesión inválida o expirada');
  if (!refreshToken) throw invalid;

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { user: true },
  });
  if (!stored) throw invalid;

  // El `where` con `revokedAt: null` hace atómica la rotación ante dos refresh simultáneos.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    if (!(await wasRevokedWithinGrace(stored.id))) await revokeAllRefreshTokens(stored.userId);
    throw invalid;
  }
  if (stored.expiresAt <= new Date()) throw invalid;

  return createSession(stored.user);
}

/** Revoca el refresh token de la sesión actual. No falla si el token no existe. */
export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Devuelve el usuario dueño del access token. */
export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  // El token puede seguir vigente aunque la cuenta ya no exista.
  if (!user) throw new AppError('UNAUTHORIZED', 'La cuenta ya no existe');
  return toUserDto(user);
}

/**
 * Indica si el token se revocó hace instantes. Es el caso de dos pestañas que piden
 * refresh casi a la vez con la misma cookie: la segunda no es un robo, solo llegó tarde.
 */
async function wasRevokedWithinGrace(tokenId: string): Promise<boolean> {
  const token = await prisma.refreshToken.findUnique({ where: { id: tokenId } });
  if (!token?.revokedAt) return false;
  return Date.now() - token.revokedAt.getTime() < REFRESH_REUSE_GRACE_MS;
}

async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
