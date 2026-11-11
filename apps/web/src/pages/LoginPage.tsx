import { Link } from 'react-router';
import { useLogin } from '../api/auth';
import { AuthCard } from '../components/AuthCard';
import { LoginForm } from '../features/auth/LoginForm';

export function LoginPage() {
  const login = useLogin();

  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle="Ingresá para ver tus gastos del mes."
      footer={
        <>
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="font-medium text-emerald-700 hover:underline">
            Registrate
          </Link>
        </>
      }
    >
      <LoginForm
        onSubmit={(values) => login.mutate(values)}
        isSubmitting={login.isPending}
        errorMessage={login.error?.message}
      />
    </AuthCard>
  );
}
