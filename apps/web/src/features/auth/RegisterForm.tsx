import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Field, INPUT_CLASSES } from '../../components/Field';
import { registerFormSchema, type RegisterFormValues } from './auth-schemas';

interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

export function RegisterForm({ onSubmit, isSubmitting, errorMessage }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}

      <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
        <input
          id="name"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          className={INPUT_CLASSES}
          {...register('name')}
        />
      </Field>

      <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          className={INPUT_CLASSES}
          {...register('email')}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          className={INPUT_CLASSES}
          {...register('password')}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  );
}
