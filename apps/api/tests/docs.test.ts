import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

const DOCUMENTED_ENDPOINTS = [
  ['post', '/auth/register'],
  ['post', '/auth/login'],
  ['post', '/auth/refresh'],
  ['post', '/auth/logout'],
  ['get', '/auth/me'],
  ['get', '/categories'],
  ['post', '/categories'],
  ['patch', '/categories/{id}'],
  ['delete', '/categories/{id}'],
  ['get', '/transactions'],
  ['get', '/transactions/{id}'],
  ['post', '/transactions'],
  ['patch', '/transactions/{id}'],
  ['delete', '/transactions/{id}'],
  ['get', '/reports/monthly'],
  ['get', '/health'],
] as const;

describe('documentación de la API', () => {
  it('sirve Swagger UI en /api/docs', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('documenta todos los endpoints de la API', async () => {
    const res = await request(app).get('/api/docs/openapi.json');

    expect(res.status).toBe(200);
    for (const [method, path] of DOCUMENTED_ENDPOINTS) {
      expect(res.body.paths[path]?.[method], `${method.toUpperCase()} ${path}`).toBeDefined();
    }
  });

  it('marca como protegidos los endpoints que exigen token', async () => {
    const res = await request(app).get('/api/docs/openapi.json');

    expect(res.body.paths['/transactions'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(res.body.paths['/auth/login'].post.security).toBeUndefined();
  });
});
