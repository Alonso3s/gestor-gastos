import { execSync } from 'node:child_process';

/** Deja la base de pruebas con el esquema actual antes de correr la suite. */
export default function setup(): void {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' });
}
