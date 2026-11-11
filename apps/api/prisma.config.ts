import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

const ENV_FILE = '../../.env';
const EXAMPLE_ENV_FILE = '../../.env.example';

/**
 * Prisma ya no carga `.env` por su cuenta. Las variables ya definidas no se pisan.
 * En producción (Docker) las variables llegan del entorno y no existe ningún archivo:
 * ahí nunca se recurre a los valores de ejemplo.
 */
function loadEnvFile(): void {
  if (existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
  } else if (process.env.NODE_ENV !== 'production' && existsSync(EXAMPLE_ENV_FILE)) {
    process.loadEnvFile(EXAMPLE_ENV_FILE);
  }
}

loadEnvFile();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
