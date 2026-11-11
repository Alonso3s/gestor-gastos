import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
