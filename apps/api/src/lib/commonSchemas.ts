import { z } from 'zod';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const idParamsSchema = z.object({ id: z.uuid('Identificador inválido') });

/** Mes en formato `YYYY-MM`. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener el formato YYYY-MM');

export type IdParams = z.infer<typeof idParamsSchema>;
