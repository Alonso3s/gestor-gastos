import { vi } from 'vitest';

export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(status: number, code: string, message = 'Error'): Response {
  return jsonResponse(status, { error: { code, message, details: [] } });
}

/** Reemplaza `fetch` por un mock que responde, en orden, con las respuestas indicadas. */
export function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Método, ruta y header Authorization de la llamada número `index` del mock. */
export function callInfo(fetchMock: ReturnType<typeof mockFetch>, index: number) {
  const call = fetchMock.mock.calls[index];
  if (!call) throw new Error(`fetch no fue llamado ${index + 1} veces`);
  const [url, init] = call;
  return {
    method: init?.method,
    path: new URL(String(url)).pathname,
    authorization: new Headers(init?.headers).get('Authorization'),
  };
}
