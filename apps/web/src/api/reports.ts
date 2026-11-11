import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './http-client';
import type { MonthlyReport } from './types';

export function useMonthlyReport(month: string) {
  return useQuery({
    queryKey: ['reports', 'monthly', month],
    queryFn: () => apiRequest<MonthlyReport>('/reports/monthly', { query: { month } }),
  });
}
