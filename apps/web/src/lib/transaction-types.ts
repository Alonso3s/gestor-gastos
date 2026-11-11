import type { TransactionType } from '../api/types';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  EXPENSE: 'Gasto',
  INCOME: 'Ingreso',
};

export const TRANSACTION_TYPES = Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[];
