import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyReport } from '../../api/types';
import { formatCurrency, formatDate } from '../../lib/format';
import { ChartCard } from './ChartCard';

interface DailyBarsProps {
  byDay: MonthlyReport['byDay'];
}

const CHART_HEIGHT = 280;
const EXPENSE_COLOR = '#f87171';
const INCOME_COLOR = '#34d399';
const DAY_START_INDEX = 'YYYY-MM-'.length;

const compactFormatter = new Intl.NumberFormat('es-CR', { notation: 'compact' });

export function DailyBars({ byDay }: DailyBarsProps) {
  const days = byDay.map((day) => ({
    date: day.date,
    dayOfMonth: Number(day.date.slice(DAY_START_INDEX)),
    Gastos: Number(day.expense),
    Ingresos: Number(day.income),
  }));

  return (
    <ChartCard title="Movimientos por día">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={days} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="dayOfMonth" tickLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(value: number) => compactFormatter.format(value)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(_label, payload) => {
              const date: unknown = payload[0]?.payload?.date;
              return typeof date === 'string' ? formatDate(date) : '';
            }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend />
          <Bar dataKey="Gastos" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Ingresos" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
