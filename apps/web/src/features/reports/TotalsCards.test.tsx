import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TotalsCards } from './TotalsCards';

const totals = { income: '450000.00', expense: '312500.50', balance: '137499.50' };

function renderCards(expenseChangePct: number | null) {
  render(
    <TotalsCards totals={totals} previousMonth={{ expense: '290000.00', expenseChangePct }} />,
  );
}

describe('TotalsCards', () => {
  it('muestra ingresos, gastos y balance en colones', () => {
    renderCards(7.76);

    expect(screen.getByText(/450\s?000,00/)).toBeInTheDocument();
    expect(screen.getByText(/312\s?500,50/)).toBeInTheDocument();
    expect(screen.getByText(/137\s?499,50/)).toBeInTheDocument();
  });

  it.each([
    [7.76, '↑ 7,76 % vs. mes anterior'],
    [-12.5, '↓ 12,5 % vs. mes anterior'],
    [0, 'Igual que el mes anterior'],
    [null, 'Sin gastos el mes anterior'],
  ])('describe la variación %s del gasto', (changePct, text) => {
    renderCards(changePct);

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
