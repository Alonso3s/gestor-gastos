import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { DEFAULT_CATEGORIES } from '../src/modules/categories/defaultCategories.js';
import { bearer, extractRefreshCookie, registerUser } from './helpers/auth.js';
import { resetDatabaseBeforeEach } from './helpers/db.js';

const app = createApp();
const validUser = { email: 'ana@example.com', password: 'secreto-123', name: 'Ana' };

resetDatabaseBeforeEach();

describe('POST /api/auth/register', () => {
  it('crea el usuario, sus categorías por defecto y devuelve la sesión', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(String), email: validUser.email, name: 'Ana' });
    expect(extractRefreshCookie(res)).toMatch(/HttpOnly; SameSite=Strict/);
    expect(extractRefreshCookie(res)).toContain('Path=/api/auth');

    const categories = await prisma.category.count({ where: { userId: res.body.user.id } });
    expect(categories).toBe(DEFAULT_CATEGORIES.length);
  });

  it('guarda la contraseña y el refresh token hasheados', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    const rawToken = extractRefreshCookie(res).split(';')[0]?.split('=')[1];

    const user = await prisma.user.findUniqueOrThrow({ where: { email: validUser.email } });
    const [storedToken] = await prisma.refreshToken.findMany();

    expect(user.passwordHash).not.toBe(validUser.password);
    expect(storedToken?.tokenHash).not.toBe(rawToken);
  });

  it('normaliza el correo a minúsculas', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: '  ANA@Example.com ' });

    expect(res.body.user.email).toBe('ana@example.com');
  });

  it('rechaza datos inválidos con el detalle de cada campo', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-es-correo', password: 'corta', name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['body.email', 'body.password', 'body.name']),
    );
  });

  it('responde 409 si el correo ya está registrado', async () => {
    await registerUser(app, validUser.email);

    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/auth/login', () => {
  it('devuelve access token y cookie de refresh con credenciales válidas', async () => {
    const user = await registerUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(extractRefreshCookie(res)).toBeTruthy();
  });

  it.each([
    ['contraseña incorrecta', { email: 'ana@example.com', password: 'otra-clave-123' }],
    ['correo inexistente', { email: 'nadie@example.com', password: 'secreto-123' }],
  ])('responde 401 con %s', async (_caso, credentials) => {
    await registerUser(app);

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Correo o contraseña incorrectos',
    });
    expect(res.get('Set-Cookie')).toBeUndefined();
  });
});

describe('POST /api/auth/refresh', () => {
  it('rota el refresh token y devuelve un access token nuevo', async () => {
    const user = await registerUser(app);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.id).toBe(user.id);
    expect(extractRefreshCookie(res)).not.toBe(user.refreshCookie);

    const again = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', extractRefreshCookie(res));
    expect(again.status).toBe(200);
  });

  it('si llega un token ya usado, revoca todas las sesiones del usuario', async () => {
    const user = await registerUser(app);
    const rotated = await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie);

    const reused = await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie);
    expect(reused.status).toBe(401);

    // El token nuevo, que era legítimo, también queda inutilizado.
    const afterReuse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', extractRefreshCookie(rotated));
    expect(afterReuse.status).toBe(401);

    const active = await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } });
    expect(active).toBe(0);
  });

  it('responde 401 sin cookie o con un token desconocido', async () => {
    const withoutCookie = await request(app).post('/api/auth/refresh');
    const unknown = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=inventado');

    expect(withoutCookie.status).toBe(401);
    expect(unknown.status).toBe(401);
  });

  it('responde 401 si el refresh token expiró', async () => {
    const user = await registerUser(app);
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie);

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revoca el refresh token y limpia la cookie', async () => {
    const user = await registerUser(app);

    const res = await request(app).post('/api/auth/logout').set('Cookie', user.refreshCookie);

    expect(res.status).toBe(204);
    expect(extractRefreshCookie(res)).toMatch(/^refreshToken=;/);

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', user.refreshCookie);
    expect(refresh.status).toBe(401);
  });

  it('responde 204 aunque no haya sesión', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(204);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve el usuario autenticado', async () => {
    const user = await registerUser(app);

    const res = await request(app)
      .get('/api/auth/me')
      .set(...bearer(user));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: user.id, email: user.email, name: 'Ana' });
  });

  it.each([
    ['sin token', undefined],
    ['con un token inválido', 'Bearer no-es-un-jwt'],
  ])('responde 401 %s', async (_caso, header) => {
    const req = request(app).get('/api/auth/me');
    const res = await (header ? req.set('Authorization', header) : req);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
