import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre').max(50, 'Máximo 50 caracteres'),
  type: z.enum(['EXPENSE', 'INCOME']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Elegí un color'),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
