import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Sin `.env` (clon recién hecho o CI) se usan los valores de ejemplo, que apuntan al Postgres de Docker Compose.
const envFile = existsSync('../../.env') ? '../../.env' : '../../.env.example';
process.loadEnvFile(envFile);

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) throw new Error('Falta DATABASE_URL_TEST para correr los tests');

export default defineConfig({
  test: {
    env: { NODE_ENV: 'test', DATABASE_URL: testDatabaseUrl },
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/helpers/globalSetup.ts'],
    // Todos los tests comparten una misma base de datos: no pueden correr en paralelo.
    fileParallelism: false,
    coverage: { include: ['src/modules/**/*.service.ts'] },
  },
});
