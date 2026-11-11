import type { Prisma, TransactionType } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/appError.js';
import { formatIsoDate, monthRange, parseIsoDate } from '../../lib/dates.js';
import { prisma } from '../../lib/prisma.js';
import { findOwnedCategory } from '../categories/categories.service.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionDto,
  TransactionListDto,
  UpdateTransactionInput,
} from './transactions.schemas.js';

const AMOUNT_DECIMALS = 2;

const withCategory = {
  category: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TransactionInclude;

type TransactionWithCategory = Prisma.TransactionGetPayload<{ include: typeof withCategory }>;

function toTransactionDto(transaction: TransactionWithCategory): TransactionDto {
  return {
    id: transaction.id,
    amount: transaction.amount.toFixed(AMOUNT_DECIMALS),
    type: transaction.type,
    description: transaction.description,
    date: formatIsoDate(transaction.date),
    categoryId: transaction.categoryId,
    category: transaction.category,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

async function findOwnedTransaction(userId: string, id: string): Promise<TransactionWithCategory> {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: withCategory,
  });
  if (!transaction) throw new AppError('NOT_FOUND', 'Transacción no encontrada');
  return transaction;
}

/** Verifica que la categoría sea del usuario y que su tipo coincida con el de la transacción. */
async function assertCategoryMatchesType(
  userId: string,
  categoryId: string,
  type: TransactionType,
): Promise<void> {
  const category = await findOwnedCategory(userId, categoryId);
  if (category.type !== type) {
    throw new AppError(
      'VALIDATION_ERROR',
      'El tipo de la transacción no coincide con el tipo de la categoría',
      [{ path: 'body.categoryId', message: `La categoría "${category.name}" es de otro tipo` }],
    );
  }
}

function buildListFilter(
  userId: string,
  query: ListTransactionsQuery,
): Prisma.TransactionWhereInput {
  const range = query.month ? monthRange(query.month) : undefined;
  return {
    userId,
    categoryId: query.categoryId,
    type: query.type,
    date: range && { gte: range.start, lt: range.end },
  };
}

/** Lista paginada de transacciones del usuario, de la más reciente a la más antigua. */
export async function listTransactions(
  userId: string,
  query: ListTransactionsQuery,
): Promise<TransactionListDto> {
  const where = buildListFilter(userId, query);
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: withCategory,
      // `createdAt` desempata transacciones del mismo día para que la paginación sea estable.
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions.map(toTransactionDto),
    meta: { page: query.page, pageSize: query.pageSize, total },
  };
}

/** Devuelve una transacción del usuario. */
export async function getTransaction(userId: string, id: string): Promise<TransactionDto> {
  return toTransactionDto(await findOwnedTransaction(userId, id));
}

/** Crea una transacción en una categoría propia del mismo tipo. */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDto> {
  await assertCategoryMatchesType(userId, input.categoryId, input.type);

  const transaction = await prisma.transaction.create({
    data: { ...input, date: parseIsoDate(input.date), userId },
    include: withCategory,
  });
  return toTransactionDto(transaction);
}

/** Edita una transacción del usuario manteniendo la coherencia entre tipo y categoría. */
export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionDto> {
  const current = await findOwnedTransaction(userId, id);

  if (input.categoryId !== undefined || input.type !== undefined) {
    await assertCategoryMatchesType(
      userId,
      input.categoryId ?? current.categoryId,
      input.type ?? current.type,
    );
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: { ...input, date: input.date === undefined ? undefined : parseIsoDate(input.date) },
    include: withCategory,
  });
  return toTransactionDto(transaction);
}

/** Borra una transacción del usuario. */
export async function deleteTransaction(userId: string, id: string): Promise<void> {
  await findOwnedTransaction(userId, id);
  await prisma.transaction.delete({ where: { id } });
}
