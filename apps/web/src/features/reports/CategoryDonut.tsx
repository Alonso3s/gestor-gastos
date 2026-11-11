import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { MonthlyReport } from '../../api/types';
import { ColorDot } from '../../components/ColorDot';
import { formatCurrency } from '../../lib/format';
import { ChartCard } from './ChartCard';

interface CategoryDonutProps {
  byCategory: MonthlyReport['byCategory'];
}

const CHART_HEIGHT = 220;

export function CategoryDonut({ byCategory }: CategoryDonutProps) {
  if (byCategory.length === 0) {
    return (
      <ChartCard title="Gasto por categoría">
        <p className="py-8 text-center text-sm text-slate-500">No hubo gastos este mes.</p>
      </ChartCard>
    );
  }

  // Recharts necesita números; la conversión es solo para dibujar, los montos se muestran desde el string.
  const slices = byCategory.map((category) => ({
    name: category.name,
    value: Number(category.total),
    fill: category.color,
  }));

  return (
    <ChartCard title="Gasto por categoría">
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="95%"
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
            />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="space-y-2 text-sm">
          {byCategory.map((category) => (
            <li key={category.categoryId} className="flex items-center gap-2">
              <ColorDot color={category.color} />
              <span className="flex-1 text-slate-700">{category.name}</span>
              <span className="text-slate-500 tabular-nums">
                {category.pct.toLocaleString('es-CR')} %
              </span>
              <span className="w-28 text-right font-medium text-slate-900 tabular-nums">
                {formatCurrency(category.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
