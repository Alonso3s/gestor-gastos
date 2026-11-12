import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses } from '../../docs/errorResponses.js';
import { jsonBody, jsonResponse, secured } from '../../docs/helpers.js';
import { authResponseSchema, loginSchema, registerSchema, userSchema } from './auth.schemas.js';

const TAG = 'Auth';

const userExample = {
  id: '3f2b8c1e-5d4a-4c6b-9e7f-1a2b3c4d5e6f',
  email: 'demo@gastos.dev',
  name: 'Usuario Demo',
};
const sessionExample = { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…', user: userExample };
const REFRESH_COOKIE_NOTE =
  'Setea la cookie `refreshToken` (httpOnly, sameSite=strict, path `/api/auth`).';

export function registerAuthPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: [TAG],
    summary: 'Crea un usuario con sus categorías por defecto',
    description: REFRESH_COOKIE_NOTE,
    request: {
      body: jsonBody(registerSchema, {
        email: 'demo@gastos.dev',
        password: 'demo1234',
        name: 'Usuario Demo',
      }),
    },
    responses: {
      201: jsonResponse('Usuario creado y sesión iniciada', authResponseSchema, sessionExample),
      ...errorResponses('VALIDATION_ERROR', 'CONFLICT', 'RATE_LIMITED'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: [TAG],
    summary: 'Inicia sesión',
    description: REFRESH_COOKIE_NOTE,
    request: { body: jsonBody(loginSchema, { email: 'demo@gastos.dev', password: 'demo1234' }) },
    responses: {
      200: jsonResponse('Sesión iniciada', authResponseSchema, sessionExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'RATE_LIMITED'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags: [TAG],
    summary: 'Rota el refresh token y devuelve un access token nuevo',
    description:
      'Lee la cookie `refreshToken`, la revoca y emite una nueva. ' +
      'Si llega un token ya revocado se cierran todas las sesiones del usuario.',
    responses: {
      200: jsonResponse('Sesión renovada', authResponseSchema, sessionExample),
      ...errorResponses('UNAUTHORIZED'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: [TAG],
    summary: 'Cierra la sesión',
    description: 'Revoca el refresh token de la cookie y la limpia.',
    responses: { 204: { description: 'Sesión cerrada' } },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: [TAG],
    summary: 'Usuario actual',
    security: secured,
    responses: {
      200: jsonResponse('Usuario autenticado', userSchema, userExample),
      ...errorResponses('UNAUTHORIZED'),
    },
  });
}
