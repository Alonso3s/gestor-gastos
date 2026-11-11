import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './http-client';

export const SESSION_QUERY_KEY = ['session'] as const;

export function createQueryClient(): QueryClient {
  // Si el refresh también falla, la sesión terminó: se limpia y las rutas protegidas redirigen al login.
  const endSessionOnUnauthorized = (error: Error) => {
    if (error instanceof ApiError && error.status === 401) {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: endSessionOnUnauthorized }),
    mutationCache: new MutationCache({ onError: endSessionOnUnauthorized }),
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 },
    },
  });
  return queryClient;
}
