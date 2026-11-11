import { hashPassword } from '../src/lib/password.js';
import { logger } from '../src/lib/logger.js';
import { prisma } from '../src/lib/prisma.js';
import { DEFAULT_CATEGORIES } from '../src/modules/categories/defaultCategories.js';

const DEMO_USER = { email: 'demo@gastos.dev', password: 'demo1234', name: 'Usuario Demo' };
const MONTHS_OF_DATA = 3;

interface SeedMovement {
  category: string;
  description: string;
  day: number;
  amount: number;
}

/** Movimientos que se repiten cada mes; el monto varía un poco según el mes. */
const MONTHLY_MOVEMENTS: readonly SeedMovement[] = [
  { category: 'Salario', description: 'Salario mensual', day: 1, amount: 850_000 },
  { category: 'Otros ingresos', description: 'Trabajo freelance', day: 12, amount: 75_000 },
  { category: 'Vivienda', description: 'Alquiler', day: 2, amount: 280_000 },
  { category: 'Servicios', description: 'Electricidad', day: 5, amount: 24_500 },
  { category: 'Servicios', description: 'Internet', day: 5, amount: 28_000 },
  { category: 'Alimentación', description: 'Supermercado', day: 3, amount: 62_350.5 },
  { category: 'Alimentación', description: 'Feria del agricultor', day: 10, amount: 18_000 },
  { category: 'Alimentación', description: 'Supermercado', day: 17, amount: 58_900 },
  { category: 'Alimentación', description: 'Almuerzo', day: 21, amount: 6_500 },
  { category: 'Transporte', description: 'Gasolina', day: 7, amount: 30_000 },
  { category: 'Transporte', description: 'Bus', day: 14, amount: 4_200 },
  { category: 'Salud', description: 'Farmacia', day: 9, amount: 12_750 },
  { category: 'Entretenimiento', description: 'Cine', day: 15, amount: 9_800 },
  { category: 'Entretenimiento', description: 'Streaming', day: 20, amount: 7_990 },
  { category: 'Educación', description: 'Curso en línea', day: 8, amount: 35_000 },
  { category: 'Otros', description: 'Regalo', day: 6, amount: 15_000 },
];

/** Primer día (UTC) del mes ubicado `monthsAgo` meses atrás. */
function monthStart(monthsAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
}

async function resetDemoUser(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_USER.email } });
  if (existing) {
    // Las transacciones se borran primero: la FK hacia Category es RESTRICT.
    await prisma.transaction.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash: await hashPassword(DEMO_USER.password),
      categories: { create: [...DEFAULT_CATEGORIES] },
    },
  });
  return user.id;
}

async function seedTransactions(userId: string): Promise<number> {
  const categories = await prisma.category.findMany({ where: { userId } });
  const categoryByName = new Map(categories.map((category) => [category.name, category]));

  const data = Array.from({ length: MONTHS_OF_DATA }, (_, monthsAgo) => {
    const start = monthStart(monthsAgo);
    // Los gastos de meses anteriores son un 5 % menores por mes, para que la comparación no dé 0 %.
    const expenseFactor = 1 - monthsAgo * 0.05;

    return MONTHLY_MOVEMENTS.map((movement) => {
      const category = categoryByName.get(movement.category);
      if (!category) throw new Error(`Categoría de seed inexistente: ${movement.category}`);
      const factor = category.type === 'EXPENSE' ? expenseFactor : 1;

      return {
        userId,
        categoryId: category.id,
        type: category.type,
        description: movement.description,
        amount: (movement.amount * factor).toFixed(2),
        date: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), movement.day)),
      };
    });
  }).flat();

  const { count } = await prisma.transaction.createMany({ data });
  return count;
}

async function main(): Promise<void> {
  const userId = await resetDemoUser();
  const count = await seedTransactions(userId);
  logger.info(
    `Seed listo: ${DEMO_USER.email} / ${DEMO_USER.password} con ${count} transacciones en ${MONTHS_OF_DATA} meses`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
