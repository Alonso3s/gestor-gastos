import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callInfo, errorResponse, jsonResponse, mockFetch } from '../test/fetch-mock';
import { ApiError, apiRequest, refreshSession, setAccessToken } from './http-client';

const user = { id: 'u1', email: 'ana@example.com', name: 'Ana' };
const newSession = { accessToken: 'token-nuevo', user };

beforeEach(() => {
  setAccessToken('token-vencido');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('envía el access token y las cookies', async () => {
    const fetchMock = mockFetch(jsonResponse(200, []));

    await apiRequest('/categories', { query: { type: 'EXPENSE', empty: '' } });

    expect(callInfo(fetchMock, 0).authorization).toBe('Bearer token-vencido');
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'http://localhost:3000/api/categories?type=EXPENSE',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
  });

  it('ante un 401 renueva la sesión y reintenta con el token nuevo', async () => {
    const fetchMock = mockFetch(
      errorResponse(401, 'UNAUTHORIZED'),
      jsonResponse(200, newSession),
      jsonResponse(200, [{ id: 'c1' }]),
    );

    const result = await apiRequest('/categories');

    expect(result).toEqual([{ id: 'c1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(callInfo(fetchMock, 1)).toMatchObject({ method: 'POST', path: '/api/auth/refresh' });
    expect(callInfo(fetchMock, 2)).toMatchObject({
      path: '/api/categories',
      authorization: 'Bearer token-nuevo',
    });
  });

  it('si el refresh falla, propaga el 401 y descarta el token', async () => {
    const fetchMock = mockFetch(
      errorResponse(401, 'UNAUTHORIZED'),
      errorResponse(401, 'UNAUTHORIZED', 'Sesión inválida o expirada'),
      jsonResponse(200, []),
    );

    await expect(apiRequest('/categories')).rejects.toMatchObject({
      status: 401,
      message: 'Sesión inválida o expirada',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await apiRequest('/categories');
    expect(callInfo(fetchMock, 2).authorization).toBeNull();
  });

  it('no intenta renovar cuando el 401 viene de una ruta de auth', async () => {
    const fetchMock = mockFetch(
      errorResponse(401, 'UNAUTHORIZED', 'Correo o contraseña incorrectos'),
    );

    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('convierte los errores de la API en ApiError', async () => {
    mockFetch(errorResponse(409, 'CONFLICT', 'Ya existe'));

    const error = await apiRequest('/categories', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT', message: 'Ya existe' });
  });

  it('devuelve undefined en respuestas 204', async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiRequest('/transactions/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('refreshSession', () => {
  it('comparte una sola petición entre llamadas simultáneas', async () => {
    const fetchMock = mockFetch(jsonResponse(200, newSession));

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(newSession);
    expect(second).toEqual(newSession);
  });

  it('dos peticiones que reciben 401 a la vez disparan un único refresh', async () => {
    const fetchMock = mockFetch(
      errorResponse(401, 'UNAUTHORIZED'),
      errorResponse(401, 'UNAUTHORIZED'),
      jsonResponse(200, newSession),
      jsonResponse(200, 'a'),
      jsonResponse(200, 'b'),
    );

    await Promise.all([apiRequest('/categories'), apiRequest('/transactions')]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
