import { Prisma, type TransactionType } from '../../generated/prisma/client.js';
import { formatIsoDate, monthRange, previousMonth, type DateRange } from '../../lib/dates.js';
import { prisma } from '../../lib/prisma.js';
import type { MonthlyReport } from './reports.schemas.js';

type Decimal = Prisma.Decimal;

const ZERO = new Prisma.Decimal(0);
const AMOUNT_DECIMALS = 2;
const CATEGORY_PCT_DECIMALS = 1;
const CHANGE_PCT_DECIMALS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatAmount(amount: Decimal): string {
  return amount.toFixed(AMOUNT_DECIMALS);
}

function percentage(part: Decimal, total: Decimal, decimals: number): number {
  return part.div(total).times(100).toDecimalPlaces(decimals).toNumber();
}

async function sumByType(
  userId: string,
  range: DateRange,
): Promise<Record<TransactionType, Decimal>> {
  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId, date: { gte: range.start, lt: range.end } },
    _sum: { amount: true },
  });

  const totals = { INCOME: ZERO, EXPENSE: ZERO };
  for (const group of groups) totals[group.type] = group._sum.amount ?? ZERO;
  return totals;
}

async function expenseByCategory(
  userId: string,
  range: DateRange,
  expenseTotal: Decimal,
): Promise<MonthlyReport['byCategory']> {
  const groups = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE', date: { gte: range.start, lt: range.end } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });
  const categories = await prisma.category.findMany({
    where: { id: { in: groups.map((group) => group.categoryId) } },
  });
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return groups.flatMap((group) => {
    const category = categoryById.get(group.categoryId);
    const total = group._sum.amount ?? ZERO;
    if (!category) return [];
    return {
      categoryId: category.id,
      name: category.name,
      color: category.color,
      total: formatAmount(total),
      pct: percentage(total, expenseTotal, CATEGORY_PCT_DECIMALS),
    };
  });
}

/** Totales por día para todos los días del rango, con 0 en los días sin movimientos. */
async function totalsByDay(userId: string, range: DateRange): Promise<MonthlyReport['byDay']> {
  const groups = await prisma.transaction.groupBy({
    by: ['date', 'type'],
    where: { userId, date: { gte: range.start, lt: range.end } },
    _sum: { amount: true },
  });
  const totalByDayAndType = new Map(
    groups.map((group) => [`${formatIsoDate(group.date)}:${group.type}`, group._sum.amount]),
  );

  const days: MonthlyReport['byDay'] = [];
  for (let time = range.start.getTime(); time < range.end.getTime(); time += MS_PER_DAY) {
    const date = formatIsoDate(new Date(time));
    days.push({
      date,
      expense: formatAmount(totalByDayAndType.get(`${date}:EXPENSE`) ?? ZERO),
      income: formatAmount(totalByDayAndType.get(`${date}:INCOME`) ?? ZERO),
    });
  }
  return days;
}

/**
 * Arma el reporte de un mes (`YYYY-MM`) del usuario.
 * Todas las sumas se hacen en la base con `Decimal`; acá solo se da formato al resultado.
 */
export async function getMonthlyReport(userId: string, month: string): Promise<MonthlyReport> {
  const range = monthRange(month);
  const [totals, previousTotals, byDay] = await Promise.all([
    sumByType(userId, range),
    sumByType(userId, monthRange(previousMonth(month))),
    totalsByDay(userId, range),
  ]);
  const previousExpense = previousTotals.EXPENSE;

  return {
    month,
    totals: {
      income: formatAmount(totals.INCOME),
      expense: formatAmount(totals.EXPENSE),
      balance: formatAmount(totals.INCOME.minus(totals.EXPENSE)),
    },
    previousMonth: {
      expense: formatAmount(previousExpense),
      // Sin gastos el mes anterior no hay base para calcular la variación.
      expenseChangePct: previousExpense.isZero()
        ? null
        : percentage(totals.EXPENSE.minus(previousExpense), previousExpense, CHANGE_PCT_DECIMALS),
    },
    byCategory: await expenseByCategory(userId, range, totals.EXPENSE),
    byDay,
  };
}
