import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryForm } from './CategoryForm';

function renderForm(isTypeLocked = false) {
  const onSubmit = vi.fn();
  render(
    <CategoryForm
      defaultValues={{ name: '', type: 'EXPENSE', color: '#64748b' }}
      isTypeLocked={isTypeLocked}
      submitLabel="Crear categoría"
      isSubmitting={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );
  return { onSubmit };
}

describe('CategoryForm', () => {
  it('envía nombre, tipo y color', async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText('Nombre'), '  Mascotas ');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Ingreso');
    await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(onSubmit).toHaveBeenCalledWith(
      { name: 'Mascotas', type: 'INCOME', color: '#64748b' },
      expect.anything(),
    );
  });

  it('exige un nombre', async () => {
    const { onSubmit } = renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(await screen.findByText('Ingresá un nombre')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloquea el tipo al editar', () => {
    renderForm(true);

    expect(screen.getByLabelText('Tipo')).toBeDisabled();
  });
});
