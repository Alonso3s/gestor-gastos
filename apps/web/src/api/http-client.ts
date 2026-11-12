import type { Session } from './types';

const API_URL: string = import.meta.env.VITE_API_URL;
const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

type QueryParams = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
}

interface ErrorDetail {
  path: string;
  message: string;
}

/** Error devuelto por la API, con su código (`VALIDATION_ERROR`, `CONFLICT`, …). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// El access token vive solo en memoria: un XSS no puede leerlo de localStorage.
let accessToken: string | null = null;
let pendingRefresh: Promise<Session> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function buildUrl(path: string, query: QueryParams = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const queryString = params.toString();
  return `${API_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    // Necesario para que viaje la cookie httpOnly del refresh token.
    credentials: 'include',
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === NO_CONTENT) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'No se pudo completar la operación',
      error?.details ?? [],
    );
  }
  return payload as T;
}

/**
 * Pide una sesión nueva con la cookie de refresh y guarda el access token.
 * Las llamadas simultáneas comparten una sola petición: el refresh token rota en cada uso,
 * así que dos peticiones en paralelo harían que la API lo tome por un token robado.
 */
export function refreshSession(): Promise<Session> {
  pendingRefresh ??= send('/auth/refresh', { method: 'POST' })
    .then((response) => parseResponse<Session>(response))
    .then((session) => {
      setAccessToken(session.accessToken);
      return session;
    })
    .catch((error: unknown) => {
      setAccessToken(null);
      throw error;
    })
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

/** Llama a la API. Ante un 401 renueva la sesión y reintenta la petición una vez. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  // En las rutas de auth un 401 significa credenciales inválidas, no token vencido.
  const canRefresh = response.status === UNAUTHORIZED && !path.startsWith('/auth/');
  if (!canRefresh) return parseResponse<T>(response);

  await refreshSession();
  return parseResponse<T>(await send(path, options));
}
