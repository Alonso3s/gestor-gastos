import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { jsonResponse } from '../../docs/helpers.js';

export function registerHealthPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Sistema'],
    summary: 'Estado de la API',
    responses: {
      200: jsonResponse('La API está arriba', z.object({ status: z.literal('ok') }), {
        status: 'ok',
      }),
    },
  });
}
