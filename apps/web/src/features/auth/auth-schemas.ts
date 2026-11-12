import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;

const emailSchema = z.email('Ingresá un correo válido');

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export const registerFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá tu nombre').max(100),
  email: emailSchema,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(72, 'La contraseña no puede superar los 72 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
