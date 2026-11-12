interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = 'Cargando…' }: SpinnerProps) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
