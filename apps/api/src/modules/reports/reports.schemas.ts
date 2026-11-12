import { z } from 'zod';
import { monthSchema } from '../../lib/commonSchemas.js';

export const monthlyReportQuerySchema = z.object({ month: monthSchema });

const decimalStringSchema = z.string();

export const monthlyReportSchema = z.object({
  month: monthSchema,
  totals: z.object({
    income: decimalStringSchema,
    expense: decimalStringSchema,
    balance: decimalStringSchema,
  }),
  previousMonth: z.object({
    expense: decimalStringSchema,
    expenseChangePct: z.number().nullable(),
  }),
  byCategory: z.array(
    z.object({
      categoryId: z.uuid(),
      name: z.string(),
      color: z.string(),
      total: decimalStringSchema,
      pct: z.number(),
    }),
  ),
  byDay: z.array(
    z.object({
      date: z.iso.date(),
      expense: decimalStringSchema,
      income: decimalStringSchema,
    }),
  ),
});

export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;
