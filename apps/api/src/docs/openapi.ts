import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registerAuthPaths } from '../modules/auth/auth.openapi.js';
import { registerCategoryPaths } from '../modules/categories/categories.openapi.js';
import { registerHealthPaths } from '../modules/health/health.openapi.js';
import { registerReportPaths } from '../modules/reports/reports.openapi.js';
import { registerTransactionPaths } from '../modules/transactions/transactions.openapi.js';
import { BEARER_AUTH } from './helpers.js';

/** Genera el documento OpenAPI 3 a partir de los mismos esquemas Zod que validan la API. */
export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', BEARER_AUTH, {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Access token devuelto por `/auth/login`, `/auth/register` o `/auth/refresh`.',
  });

  registerAuthPaths(registry);
  registerCategoryPaths(registry);
  registerTransactionPaths(registry);
  registerReportPaths(registry);
  registerHealthPaths(registry);

  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Gestor de Gastos Personales',
      version: '0.1.0',
      description:
        'API para registrar gastos e ingresos y consultar reportes mensuales. ' +
        'Montos como string decimal en colones (CRC), fechas `YYYY-MM-DD` y meses `YYYY-MM`.',
    },
    servers: [{ url: '/api' }],
  });
}
