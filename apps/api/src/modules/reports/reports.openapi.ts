import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { errorResponses } from '../../docs/errorResponses.js';
import { jsonResponse, secured } from '../../docs/helpers.js';
import { categoryExample } from '../categories/categories.openapi.js';
import { monthlyReportQuerySchema, monthlyReportSchema } from './reports.schemas.js';

const monthlyReportExample = {
  month: '2026-11',
  totals: { income: '450000.00', expense: '312500.50', balance: '137499.50' },
  previousMonth: { expense: '290000.00', expenseChangePct: 7.76 },
  byCategory: [
    {
      categoryId: categoryExample.id,
      name: categoryExample.name,
      color: categoryExample.color,
      total: '120000.00',
      pct: 38.4,
    },
  ],
  byDay: [{ date: '2026-11-01', expense: '15000.00', income: '0.00' }],
};

export function registerReportPaths(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/reports/monthly',
    tags: ['Reportes'],
    summary: 'Reporte mensual',
    description:
      'Totales del mes, comparación del gasto con el mes anterior, gasto por categoría y ' +
      'movimientos por día. `byDay` trae todos los días del mes. ' +
      '`expenseChangePct` es `null` si el mes anterior no tuvo gastos.',
    security: secured,
    request: { query: monthlyReportQuerySchema },
    responses: {
      200: jsonResponse('Reporte del mes', monthlyReportSchema, monthlyReportExample),
      ...errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED'),
    },
  });
}
