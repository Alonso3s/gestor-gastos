import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const FORWARDED_IP = '203.0.113.7';

/** Carga la app de cero para que `env` se lea con el `TRUST_PROXY` indicado. */
async function requestIpWith(trustProxy: string): Promise<unknown> {
  vi.resetModules();
  vi.stubEnv('TRUST_PROXY', trustProxy);
  const { createApp } = await import('../src/app.js');
  const { logger } = await import('../src/lib/logger.js');
  const logSpy = vi.spyOn(logger, 'info');

  await request(createApp()).get('/api/no-existe').set('X-Forwarded-For', FORWARDED_IP);

  const [logged] = logSpy.mock.calls.at(-1) ?? [];
  return (logged as { ip?: unknown }).ip;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('TRUST_PROXY', () => {
  it('con TRUST_PROXY=1 la IP del cliente sale de X-Forwarded-For', async () => {
    expect(await requestIpWith('1')).toBe(FORWARDED_IP);
  });

  it('con TRUST_PROXY=0 se ignora X-Forwarded-For', async () => {
    expect(await requestIpWith('0')).not.toBe(FORWARDED_IP);
  });
});
