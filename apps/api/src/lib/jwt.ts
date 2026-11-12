import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn: env.JWT_ACCESS_TTL });
}

/** Devuelve el id del usuario si el token es válido y no expiró; si no, `null`. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return typeof payload === 'object' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
