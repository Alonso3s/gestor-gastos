import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// Prisma ya no carga `.env` por su cuenta. Las variables ya definidas (p. ej. en los tests) no se pisan.
process.loadEnvFile(existsSync('../../.env') ? '../../.env' : '../../.env.example');

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
