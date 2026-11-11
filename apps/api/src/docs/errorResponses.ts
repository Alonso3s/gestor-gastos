import type { ResponseConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import type { ErrorCode } from '../lib/appError.js';
import { ERROR_STATUS } from '../lib/appError.js';

export const errorSchema = z.object({
  error: z.object({
    code: z.enum(Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]]),
    message: z.string(),
    details: z.array(z.unknown()),
  }),
});

const ERROR_EXAMPLES: Record<ErrorCode, { message: string; details: unknown[] }> = {
  VALIDATION_ERROR: {
    message: 'Los datos enviados no son válidos',
    details: [{ path: 'body.amount', message: 'El monto debe ser mayor a 0' }],
  },
  UNAUTHORIZED: { message: 'Token de acceso inválido o ausente', details: [] },
  NOT_FOUND: { message: 'Recurso no encontrado', details: [] },
  CONFLICT: { message: 'El recurso entra en conflicto con uno existente', details: [] },
  RATE_LIMITED: { message: 'Demasiados intentos. Probá de nuevo en unos minutos', details: [] },
  INTERNAL_ERROR: { message: 'Error interno del servidor', details: [] },
};

function errorResponse(code: ErrorCode, description: string): ResponseConfig {
  return {
    description,
    content: {
      'application/json': {
        schema: errorSchema,
        example: { error: { code, ...ERROR_EXAMPLES[code] } },
      },
    },
  };
}

/**
 * Arma las respuestas de error de un endpoint a partir de sus códigos,
 * p. ej. `errorResponses('VALIDATION_ERROR', 'UNAUTHORIZED')` → `{ 400: …, 401: … }`.
 */
export function errorResponses(...codes: ErrorCode[]): Record<number, ResponseConfig> {
  const descriptions: Record<ErrorCode, string> = {
    VALIDATION_ERROR: 'Datos inválidos',
    UNAUTHORIZED: 'Falta el token o la sesión no es válida',
    NOT_FOUND: 'El recurso no existe o pertenece a otro usuario',
    CONFLICT: 'Conflicto con el estado actual',
    RATE_LIMITED: 'Demasiadas peticiones',
    INTERNAL_ERROR: 'Error inesperado',
  };
  return Object.fromEntries(
    codes.map((code) => [ERROR_STATUS[code], errorResponse(code, descriptions[code])]),
  );
}
