import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '../../api/types';
import type { TransactionFormValues } from './transaction-schema';
import { TransactionForm } from './TransactionForm';

const categories: Category[] = [
  { id: 'c-food', name: 'Alimentación', type: 'EXPENSE', color: '#22c55e' },
  { id: 'c-salary', name: 'Salario', type: 'INCOME', color: '#16a34a' },
];

const emptyValues: TransactionFormValues = {
  type: 'EXPENSE',
  amount: '',
  date: '2026-11-05',
  categoryId: '',
  description: '',
};

function renderForm(defaultValues = emptyValues) {
  const onSubmit = vi.fn();
  render(
    <TransactionForm
      categories={categories}
      defaultValues={defaultValues}
      submitLabel="Crear transacción"
      isSubmitting={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );
  return { onSubmit };
}

function categoryOptions(): string[] {
  const select = screen.getByLabelText<HTMLSelectElement>('Categoría');
  return Array.from(select.options, (option) => option.text);
}

describe('TransactionForm', () => {
  it('envía los valores cuando el formulario es válido', async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText('Monto (₡)'), '12500.50');
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'Alimentación');
    await userEvent.type(screen.getByLabelText('Descripción (opcional)'), 'Supermercado');
    await userEvent.click(screen.getByRole('button', { name: 'Crear transacción' }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        type: 'EXPENSE',
        amount: '12500.50',
        date: '2026-11-05',
        categoryId: 'c-food',
        description: 'Supermercado',
      },
      expect.anything(),
    );
  });

  it('muestra errores si faltan el monto y la categoría', async () => {
    const { onSubmit } = renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Crear transacción' }));

    expect(await screen.findByText(/Ingresá un monto con hasta 2 decimales/)).toBeInTheDocument();
    expect(screen.getByText('Elegí una categoría', { selector: 'p' })).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['0', 'El monto debe ser mayor a 0'],
    ['10.555', /hasta 2 decimales/],
    ['-5', /hasta 2 decimales/],
  ])('rechaza el monto "%s"', async (amount, message) => {
    const { onSubmit } = renderForm({ ...emptyValues, categoryId: 'c-food' });

    await userEvent.type(screen.getByLabelText('Monto (₡)'), amount);
    await userEvent.click(screen.getByRole('button', { name: 'Crear transacción' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ofrece solo las categorías del tipo elegido y limpia la selección al cambiarlo', async () => {
    renderForm({ ...emptyValues, categoryId: 'c-food' });
    expect(categoryOptions()).toEqual(['Elegí una categoría', 'Alimentación']);

    await userEvent.click(screen.getByLabelText('Ingreso'));

    expect(categoryOptions()).toEqual(['Elegí una categoría', 'Salario']);
    expect(screen.getByLabelText('Categoría')).toHaveValue('');
  });

  it('carga los valores de la transacción al editar', () => {
    renderForm({
      type: 'INCOME',
      amount: '450000.00',
      date: '2026-11-01',
      categoryId: 'c-salary',
      description: 'Salario mensual',
    });

    expect(screen.getByLabelText('Ingreso')).toBeChecked();
    expect(screen.getByLabelText('Monto (₡)')).toHaveValue('450000.00');
    expect(screen.getByLabelText('Categoría')).toHaveValue('c-salary');
  });
});
