import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

// Prisma ya no carga `.env` por su cuenta. Las variables ya definidas (p. ej. en los tests) no se pisan.
// En producción las variables llegan por Docker, así que no se recurre a `.env.example`.
const envFile = ['../../.env', '../../.env.example'].find(
  (file, index) => existsSync(file) && (index === 0 || process.env.NODE_ENV !== 'production'),
);
if (envFile) process.loadEnvFile(envFile);

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
