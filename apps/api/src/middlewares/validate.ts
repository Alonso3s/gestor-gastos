import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/appError.js';

const REQUEST_PARTS = ['params', 'query', 'body'] as const;

type RequestSchemas = Partial<Record<(typeof REQUEST_PARTS)[number], ZodType>>;

function toDetails(part: string, issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    path: [part, ...issue.path].join('.'),
    message: issue.message,
  }));
}

/**
 * Valida las partes indicadas de la petición y las reemplaza por el resultado ya parseado,
 * de modo que el controller reciba datos con los tipos inferidos del esquema.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res, next) => {
    for (const part of REQUEST_PARTS) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Los datos enviados no son válidos',
          toDetails(part, result.error.issues),
        );
      }
      // `req.query` es de solo lectura en Express 5, por eso no se asigna directamente.
      Object.defineProperty(req, part, { value: result.data, writable: true });
    }
    next();
  };
}
