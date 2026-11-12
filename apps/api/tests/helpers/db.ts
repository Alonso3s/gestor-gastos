import { beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

/** Vacía todas las tablas antes de cada test para que no dependan entre sí. */
export function resetDatabaseBeforeEach(): void {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "User", "Category", "Transaction", "RefreshToken" CASCADE`;
  });
}
