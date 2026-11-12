import type { ReactNode } from 'react';
import { classNames } from '../lib/class-names';

interface AlertProps {
  variant: 'error' | 'success';
  children: ReactNode;
}

const VARIANT_CLASSES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export function Alert({ variant, children }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={classNames('rounded-lg border px-4 py-3 text-sm', VARIANT_CLASSES[variant])}
    >
      {children}
    </div>
  );
}
