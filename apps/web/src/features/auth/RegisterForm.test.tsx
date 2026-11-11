import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './RegisterForm';

describe('RegisterForm', () => {
  it('envía los datos cuando son válidos', async () => {
    const onSubmit = vi.fn();
    render(<RegisterForm onSubmit={onSubmit} isSubmitting={false} />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto-123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'Ana', email: 'ana@example.com', password: 'secreto-123' },
      expect.anything(),
    );
  });

  it('exige una contraseña de al menos 8 caracteres', async () => {
    const onSubmit = vi.fn();
    render(<RegisterForm onSubmit={onSubmit} isSubmitting={false} />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana');
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'corta');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
