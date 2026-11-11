/** Tipos de las respuestas de la API. Los montos viajan como string decimal. */

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  accessToken: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string;
  category: Pick<Category, 'id' | 'name' | 'color'>;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface MonthlyReport {
  month: string;
  totals: { income: string; expense: string; balance: string };
  previousMonth: { expense: string; expenseChangePct: number | null };
  byCategory: { categoryId: string; name: string; color: string; total: string; pct: number }[];
  byDay: { date: string; expense: string; income: string }[];
}
