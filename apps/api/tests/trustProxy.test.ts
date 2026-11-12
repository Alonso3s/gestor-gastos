import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** Arma la app con `TRUST_PROXY` dado y agrega una ruta que devuelve `req.ip`. */
async function appWithTrustProxy(value: string): Promise<express.Express> {
  vi.stubEnv('TRUST_PROXY', value);
  const { createApp } = await import('../src/app.js');
  const app = express();
  app.get('/ip', (req, res) => res.json({ ip: req.ip }));
  app.set('trust proxy', createApp().get('trust proxy'));
  return app;
}

describe('TRUST_PROXY', () => {
  it('con 1 toma la IP del cliente desde X-Forwarded-For', async () => {
    const app = await appWithTrustProxy('1');

    const res = await request(app).get('/ip').set('X-Forwarded-For', '203.0.113.7');

    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('por defecto ignora X-Forwarded-For', async () => {
    const app = await appWithTrustProxy('0');

    const res = await request(app).get('/ip').set('X-Forwarded-For', '203.0.113.7');

    expect(res.body.ip).not.toBe('203.0.113.7');
  });
});
