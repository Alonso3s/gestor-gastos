import type { TransactionType } from '../../generated/prisma/client.js';

interface DefaultCategory {
  name: string;
  type: TransactionType;
  color: string;
}

/** Categorías que recibe cada usuario al registrarse. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Alimentación', type: 'EXPENSE', color: '#22c55e' },
  { name: 'Transporte', type: 'EXPENSE', color: '#3b82f6' },
  { name: 'Vivienda', type: 'EXPENSE', color: '#a855f7' },
  { name: 'Servicios', type: 'EXPENSE', color: '#f59e0b' },
  { name: 'Salud', type: 'EXPENSE', color: '#ef4444' },
  { name: 'Entretenimiento', type: 'EXPENSE', color: '#ec4899' },
  { name: 'Educación', type: 'EXPENSE', color: '#14b8a6' },
  { name: 'Otros', type: 'EXPENSE', color: '#64748b' },
  { name: 'Salario', type: 'INCOME', color: '#16a34a' },
  { name: 'Otros ingresos', type: 'INCOME', color: '#0ea5e9' },
];
