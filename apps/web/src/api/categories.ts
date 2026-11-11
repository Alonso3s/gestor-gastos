import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './http-client';
import type { Category, TransactionType } from './types';

const CATEGORIES_KEY = 'categories';
// Las transacciones y el reporte incluyen nombre y color de la categoría.
const KEYS_AFFECTED_BY_CATEGORIES = [CATEGORIES_KEY, 'transactions', 'reports'];

export interface CategoryInput {
  name: string;
  type: TransactionType;
  color: string;
}

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: () => apiRequest<Category[]>('/categories'),
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      KEYS_AFFECTED_BY_CATEGORIES.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiRequest<Category>('/categories', { method: 'POST', body: input }),
    onSuccess: useInvalidateCategories(),
  });
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({ id, name, color }: Pick<Category, 'id' | 'name' | 'color'>) =>
      apiRequest<Category>(`/categories/${id}`, { method: 'PATCH', body: { name, color } }),
    onSuccess: useInvalidateCategories(),
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: useInvalidateCategories(),
  });
}
