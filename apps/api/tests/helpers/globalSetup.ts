import { execSync } from 'node:child_process';

/** Deja la base de pruebas con el esquema actual antes de correr la suite. */
export default function setup(): void {
  // `test.env` de Vitest solo llega a los workers, así que la URL de pruebas se pasa a mano.
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
  });
}
