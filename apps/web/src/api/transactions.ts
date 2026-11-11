import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './http-client';
import type { Paginated, Transaction, TransactionType } from './types';

const TRANSACTIONS_KEY = 'transactions';

export interface TransactionFilters {
  month: string;
  type: TransactionType | '';
  categoryId: string;
  page: number;
}

export interface TransactionInput {
  amount: string;
  type: TransactionType;
  date: string;
  categoryId: string;
  description: string | null;
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, filters],
    queryFn: () => apiRequest<Paginated<Transaction>>('/transactions', { query: { ...filters } }),
    // Mantiene la página anterior en pantalla mientras carga la siguiente.
    placeholderData: keepPreviousData,
  });
}

function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
    ]);
}

export function useCreateTransaction() {
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      apiRequest<Transaction>('/transactions', { method: 'POST', body: input }),
    onSuccess: useInvalidateTransactions(),
  });
}

export function useUpdateTransaction() {
  return useMutation({
    mutationFn: ({ id, ...input }: TransactionInput & { id: string }) =>
      apiRequest<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: input }),
    onSuccess: useInvalidateTransactions(),
  });
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: useInvalidateTransactions(),
  });
}
