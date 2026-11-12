import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest, refreshSession, setAccessToken } from './http-client';
import { SESSION_QUERY_KEY } from './query-client';
import type { Session, User } from './types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

/** Recupera la sesión con la cookie de refresh; `null` si no hay sesión activa. */
async function restoreSession(): Promise<User | null> {
  try {
    const session = await refreshSession();
    return session.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** Usuario actual. Al cargar la página intenta restaurar la sesión vía refresh. */
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: restoreSession,
    staleTime: Infinity,
  });
}

function useStartSession<TInput>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => apiRequest<Session>(path, { method: 'POST', body: input }),
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      queryClient.setQueryData(SESSION_QUERY_KEY, session.user);
    },
  });
}

export function useLogin() {
  return useStartSession<LoginInput>('/auth/login');
}

export function useRegister() {
  return useStartSession<RegisterInput>('/auth/register');
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST' }),
    // Aunque falle la petición, se cierra la sesión local para no dejar datos en pantalla.
    onSettled: () => {
      setAccessToken(null);
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      // Se descartan los datos del usuario que salió para que no los vea el siguiente.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
      });
    },
  });
}
