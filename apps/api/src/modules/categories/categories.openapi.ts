import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { errorResponses } from '../../docs/errorResponses.js';
import { jsonBody, jsonResponse, secured } from '../../docs/helpers.js';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import {
  categorySchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './categories.schemas.js';

const TAG = 'Categorías';

export const categoryExample = {
  id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  name: 'Alimentación',
  type: 'EXPENSE',
  color: '#22c55e',
};

export function registerCategoryPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/categories',
    tags: [TAG],
    summary: 'Lista las categorías del usuario',
    security: secured,
    request: { query: listCategoriesQuerySchema },
    responses: {
      200: jsonResponse('Categorías ordenadas por tipo y nombre', z.array(categorySchema), [
        categoryExample,
      ]),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/categories',
    tags: [TAG],
    summary: 'Crea una categoría',
    security: secured,
    request: {
      body: jsonBody(createCategorySchema, { name: 'Mascotas', type: 'EXPENSE', color: '#f97316' }),
    },
    responses: {
      201: jsonResponse('Categoría creada', categorySchema, categoryExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'CONFLICT'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/categories/{id}',
    tags: [TAG],
    summary: 'Edita el nombre y/o el color de una categoría',
    security: secured,
    request: {
      params: idParamsSchema,
      body: jsonBody(updateCategorySchema, { name: 'Comida', color: '#16a34a' }),
    },
    responses: {
      200: jsonResponse('Categoría actualizada', categorySchema, categoryExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND', 'CONFLICT'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/categories/{id}',
    tags: [TAG],
    summary: 'Borra una categoría',
    description: 'Responde `409` si la categoría tiene transacciones.',
    security: secured,
    request: { params: idParamsSchema },
    responses: {
      204: { description: 'Categoría borrada' },
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND', 'CONFLICT'),
    },
  });
}
