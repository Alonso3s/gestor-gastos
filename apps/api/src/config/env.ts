import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.url(),
  // Cantidad de proxies inversos delante de la API (1 en producción: Caddy).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  // Duración con unidad, p. ej. `15m`, `1h` o `7d`.
  JWT_ACCESS_TTL: z.templateLiteral([z.int().positive(), z.enum(['s', 'm', 'h', 'd'])]),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Se falla al arrancar: es preferible no levantar la API a correr mal configurada.
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
