import { z } from 'zod';
import { transactionTypeSchema } from '../../lib/commonSchemas.js';

const nameSchema = z.string().trim().min(1, 'El nombre es obligatorio').max(50);
const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser hexadecimal, por ejemplo #22c55e');

export const createCategorySchema = z.object({
  name: nameSchema,
  type: transactionTypeSchema,
  color: colorSchema.optional(),
});

// El tipo no se puede editar: dejaría transacciones con un tipo distinto al de su categoría.
export const updateCategorySchema = z
  .object({ name: nameSchema, color: colorSchema })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Enviá al menos un campo para actualizar');

export const listCategoriesQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
});

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: transactionTypeSchema,
  color: z.string(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CategoryDto = z.infer<typeof categorySchema>;
