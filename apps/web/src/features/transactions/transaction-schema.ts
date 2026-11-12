import { z } from 'zod';

export const transactionFormSchema = z.object({
  type: z.enum(['EXPENSE', 'INCOME']),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Ingresá un monto con hasta 2 decimales, por ejemplo 12500.50')
    .refine((value) => Number(value) > 0, 'El monto debe ser mayor a 0'),
  date: z.iso.date('Elegí una fecha'),
  categoryId: z.string().min(1, 'Elegí una categoría'),
  description: z.string().trim().max(255, 'Máximo 255 caracteres'),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
