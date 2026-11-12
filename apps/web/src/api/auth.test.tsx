import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorResponse, jsonResponse, mockFetch } from '../test/fetch-mock';
import { useSession } from './auth';
import { createQueryClient } from './query-client';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSession', () => {
  it('restaura la sesión con la cookie de refresh al cargar', async () => {
    const user = { id: 'u1', email: 'ana@example.com', name: 'Ana' };
    mockFetch(jsonResponse(200, { accessToken: 'token', user }));

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(user));
  });

  it('devuelve null si no hay sesión activa', async () => {
    mockFetch(errorResponse(401, 'UNAUTHORIZED'));

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
