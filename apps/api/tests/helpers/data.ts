import { prisma } from '../../src/lib/prisma.js';
import type { TransactionType } from '../../src/generated/prisma/client.js';

/** Id de una de las categorías por defecto del usuario, buscada por nombre. */
export async function categoryIdByName(userId: string, name: string): Promise<string> {
  const category = await prisma.category.findFirstOrThrow({ where: { userId, name } });
  return category.id;
}

interface TransactionSeed {
  category: string;
  amount: string;
  date: string;
  description?: string;
}

/** Inserta transacciones directo en la base, tomando el tipo de la categoría indicada. */
export async function insertTransactions(userId: string, seeds: TransactionSeed[]): Promise<void> {
  const categories = await prisma.category.findMany({ where: { userId } });
  const byName = new Map(categories.map((category) => [category.name, category]));

  await prisma.transaction.createMany({
    data: seeds.map((seed) => {
      const category = byName.get(seed.category);
      if (!category) throw new Error(`Categoría inexistente: ${seed.category}`);
      const type: TransactionType = category.type;
      return {
        userId,
        categoryId: category.id,
        type,
        amount: seed.amount,
        date: new Date(seed.date),
        description: seed.description,
      };
    }),
  });
}
