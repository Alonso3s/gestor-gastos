import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

describe('GET /api/health', () => {
  it('responde 200 cuando la API llega a la base', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/health sin base de datos', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde 503 si la base no contesta', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('conexión rechazada'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error' });
  });
});

describe('rutas inexistentes', () => {
  it('responde 404 con el formato de error único', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', details: [] });
  });
});
