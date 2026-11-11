import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses } from '../../docs/errorResponses.js';
import { jsonBody, jsonResponse, secured } from '../../docs/helpers.js';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import { categoryExample } from '../categories/categories.openapi.js';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionListSchema,
  transactionSchema,
  updateTransactionSchema,
} from './transactions.schemas.js';

const TAG = 'Transacciones';

const transactionInputExample = {
  amount: '12500.50',
  type: 'EXPENSE',
  date: '2026-11-05',
  categoryId: categoryExample.id,
  description: 'Supermercado',
};

const transactionExample = {
  id: '1c9d4f6a-8b2e-4d3c-a5f7-0e1d2c3b4a59',
  ...transactionInputExample,
  category: { id: categoryExample.id, name: categoryExample.name, color: categoryExample.color },
  createdAt: '2026-11-05T14:30:00.000Z',
  updatedAt: '2026-11-05T14:30:00.000Z',
};

export function registerTransactionPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/transactions',
    tags: [TAG],
    summary: 'Lista paginada de transacciones',
    description: 'Ordenada por fecha descendente. Todos los filtros son opcionales y combinables.',
    security: secured,
    request: { query: listTransactionsQuerySchema },
    responses: {
      200: jsonResponse('Página de transacciones', transactionListSchema, {
        data: [transactionExample],
        meta: { page: 1, pageSize: 20, total: 1 },
      }),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/transactions/{id}',
    tags: [TAG],
    summary: 'Detalle de una transacción',
    security: secured,
    request: { params: idParamsSchema },
    responses: {
      200: jsonResponse('Transacción', transactionSchema, transactionExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/transactions',
    tags: [TAG],
    summary: 'Crea una transacción',
    description:
      'El `type` debe coincidir con el tipo de la categoría. `amount` siempre es positivo.',
    security: secured,
    request: { body: jsonBody(createTransactionSchema, transactionInputExample) },
    responses: {
      201: jsonResponse('Transacción creada', transactionSchema, transactionExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/transactions/{id}',
    tags: [TAG],
    summary: 'Edita una transacción',
    security: secured,
    request: {
      params: idParamsSchema,
      body: jsonBody(updateTransactionSchema, { amount: '13000.00', description: 'Feria' }),
    },
    responses: {
      200: jsonResponse('Transacción actualizada', transactionSchema, transactionExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND'),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/transactions/{id}',
    tags: [TAG],
    summary: 'Borra una transacción',
    security: secured,
    request: { params: idParamsSchema },
    responses: {
      204: { description: 'Transacción borrada' },
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND'),
    },
  });
}
