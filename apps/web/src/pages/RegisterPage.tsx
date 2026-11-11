import { Link } from 'react-router';
import { useRegister } from '../api/auth';
import { AuthCard } from '../components/AuthCard';
import { RegisterForm } from '../features/auth/RegisterForm';

export function RegisterPage() {
  const register = useRegister();

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Empezá con categorías listas para usar."
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:underline">
            Iniciá sesión
          </Link>
        </>
      }
    >
      <RegisterForm
        onSubmit={(values) => register.mutate(values)}
        isSubmitting={register.isPending}
        errorMessage={register.error?.message}
      />
    </AuthCard>
  );
}
