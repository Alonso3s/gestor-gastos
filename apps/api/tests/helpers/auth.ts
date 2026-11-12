import type { Express } from 'express';
import request from 'supertest';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  /** Cookie de refresh tal como la devolvió la API, lista para reenviarla. */
  refreshCookie: string;
}

const TEST_PASSWORD = 'secreto-123';

export function extractRefreshCookie(res: request.Response): string {
  const cookies = res.get('Set-Cookie') ?? [];
  const cookie = cookies.find((value) => value.startsWith('refreshToken='));
  if (!cookie) throw new Error('La respuesta no trae la cookie de refresh');
  return cookie;
}

/** Registra un usuario por la API y devuelve sus credenciales. */
export async function registerUser(app: Express, email = 'ana@example.com'): Promise<TestUser> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: TEST_PASSWORD, name: 'Ana' });
  if (res.status !== 201) throw new Error(`No se pudo registrar a ${email}: ${res.status}`);

  return {
    id: res.body.user.id,
    email,
    password: TEST_PASSWORD,
    accessToken: res.body.accessToken,
    refreshCookie: extractRefreshCookie(res),
  };
}

export function bearer(user: TestUser): [string, string] {
  return ['Authorization', `Bearer ${user.accessToken}`];
}
