import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { jsonResponse } from '../../docs/helpers.js';

export function registerHealthPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Sistema'],
    summary: 'Estado de la API y de la base de datos',
    responses: {
      200: jsonResponse('La API y la base responden', z.object({ status: z.literal('ok') }), {
        status: 'ok',
      }),
      503: jsonResponse('La base de datos no responde', z.object({ status: z.literal('error') }), {
        status: 'error',
      }),
    },
  });
}
