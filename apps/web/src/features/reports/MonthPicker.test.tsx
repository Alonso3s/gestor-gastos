import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MonthPicker } from './MonthPicker';

it('avanza y retrocede de mes', async () => {
  const onChange = vi.fn();
  render(<MonthPicker month="2026-01" onChange={onChange} />);

  await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
  await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

  expect(onChange).toHaveBeenNthCalledWith(1, '2025-12');
  expect(onChange).toHaveBeenNthCalledWith(2, '2026-02');
});
