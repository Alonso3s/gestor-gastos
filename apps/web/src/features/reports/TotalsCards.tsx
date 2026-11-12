import type { ReactNode } from 'react';
import type { MonthlyReport } from '../../api/types';
import { classNames } from '../../lib/class-names';
import { formatCurrency } from '../../lib/format';

interface TotalsCardsProps {
  totals: MonthlyReport['totals'];
  previousMonth: MonthlyReport['previousMonth'];
}

interface StatCardProps {
  label: string;
  value: string;
  valueClassName?: string;
  children?: ReactNode;
}

function StatCard({ label, value, valueClassName, children }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={classNames(
          'mt-1 text-xl font-semibold tabular-nums',
          valueClassName ?? 'text-slate-900',
        )}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

function describeExpenseChange(changePct: number | null): { text: string; className: string } {
  if (changePct === null)
    return { text: 'Sin gastos el mes anterior', className: 'text-slate-500' };
  if (changePct === 0) return { text: 'Igual que el mes anterior', className: 'text-slate-500' };

  const magnitude = Math.abs(changePct).toLocaleString('es-CR');
  // Gastar más que el mes pasado es la mala noticia, por eso el aumento va en rojo.
  return changePct > 0
    ? { text: `↑ ${magnitude} % vs. mes anterior`, className: 'text-red-600' }
    : { text: `↓ ${magnitude} % vs. mes anterior`, className: 'text-emerald-700' };
}

export function TotalsCards({ totals, previousMonth }: TotalsCardsProps) {
  const change = describeExpenseChange(previousMonth.expenseChangePct);
  const isNegativeBalance = Number(totals.balance) < 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Ingresos"
        value={formatCurrency(totals.income)}
        valueClassName="text-emerald-700"
      />
      <StatCard label="Gastos" value={formatCurrency(totals.expense)}>
        <p className={classNames('mt-1 text-xs', change.className)}>{change.text}</p>
      </StatCard>
      <StatCard
        label="Balance"
        value={formatCurrency(totals.balance)}
        valueClassName={isNegativeBalance ? 'text-red-600' : undefined}
      />
    </div>
  );
}
