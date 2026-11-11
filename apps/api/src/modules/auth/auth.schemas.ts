import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Correo electrónico inválido'));

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`)
    // bcrypt ignora todo lo que pase de 72 bytes.
    .max(72, 'La contraseña no puede superar los 72 caracteres'),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserDto = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
