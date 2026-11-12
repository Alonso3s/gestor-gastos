import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('envía las credenciales cuando son válidas', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} isSubmitting={false} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto-123');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onSubmit).toHaveBeenCalledWith(
      { email: 'ana@example.com', password: 'secreto-123' },
      expect.anything(),
    );
  });

  it('muestra los errores de validación y no envía', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} isSubmitting={false} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'no-es-correo');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByText('Ingresá un correo válido')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu contraseña')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error de la API y bloquea el botón mientras envía', () => {
    render(
      <LoginForm onSubmit={vi.fn()} isSubmitting errorMessage="Correo o contraseña incorrectos" />,
    );

    expect(screen.getByText('Correo o contraseña incorrectos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();
  });
});
