import { useState } from 'react';
import { Link } from 'react-router';
import { useMonthlyReport } from '../api/reports';
import type { MonthlyReport } from '../api/types';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { CategoryDonut } from '../features/reports/CategoryDonut';
import { DailyBars } from '../features/reports/DailyBars';
import { MonthPicker } from '../features/reports/MonthPicker';
import { TotalsCards } from '../features/reports/TotalsCards';
import { currentMonth, formatMonth } from '../lib/format';

function hasMovements(report: MonthlyReport): boolean {
  return Number(report.totals.income) > 0 || Number(report.totals.expense) > 0;
}

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const report = useMonthlyReport(month);

  const renderReport = () => {
    if (report.isPending) return <Spinner label="Cargando el reporte…" />;
    if (report.isError) return <Alert variant="error">{report.error.message}</Alert>;
    if (!hasMovements(report.data)) {
      return (
        <EmptyState
          title={`Sin movimientos en ${formatMonth(month)}`}
          description="Registrá un gasto o un ingreso para ver el reporte del mes."
          action={
            <Link
              to="/transacciones"
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              Ir a transacciones
            </Link>
          }
        />
      );
    }
    return (
      <div className="space-y-4">
        <TotalsCards totals={report.data.totals} previousMonth={report.data.previousMonth} />
        <CategoryDonut byCategory={report.data.byCategory} />
        <DailyBars byDay={report.data.byDay} />
      </div>
    );
  };

  return (
    <>
      <PageHeader title={`Resumen de ${formatMonth(month)}`}>
        <MonthPicker month={month} onChange={setMonth} />
      </PageHeader>
      {renderReport()}
    </>
  );
}
