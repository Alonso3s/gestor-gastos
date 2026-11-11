import { z } from 'zod';
import { monthSchema, transactionTypeSchema } from '../../lib/commonSchemas.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Decimal positivo con hasta 2 decimales, acorde a la columna `Decimal(12, 2)`. */
const amountSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(
    z
      .string()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, 'El monto debe ser un número con hasta 2 decimales')
      .refine((value) => Number(value) > 0, 'El monto debe ser mayor a 0'),
  );

const dateSchema = z.iso.date('La fecha debe tener el formato YYYY-MM-DD');
const descriptionSchema = z.string().trim().max(255).nullable();

export const createTransactionSchema = z.object({
  amount: amountSchema,
  type: transactionTypeSchema,
  date: dateSchema,
  categoryId: z.uuid('Categoría inválida'),
  description: descriptionSchema.optional(),
});

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Enviá al menos un campo para actualizar');

export const listTransactionsQuerySchema = z.object({
  month: monthSchema.optional(),
  categoryId: z.uuid('Categoría inválida').optional(),
  type: transactionTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const transactionSchema = z.object({
  id: z.uuid(),
  amount: z.string(),
  type: transactionTypeSchema,
  description: z.string().nullable(),
  date: z.iso.date(),
  categoryId: z.uuid(),
  category: z.object({ id: z.uuid(), name: z.string(), color: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const transactionListSchema = z.object({
  data: z.array(transactionSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type TransactionDto = z.infer<typeof transactionSchema>;
export type TransactionListDto = z.infer<typeof transactionListSchema>;
