import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/appError.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError('NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.path}`);
};

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  // body-parser marca así el JSON mal formado.
  if (err instanceof SyntaxError && 'body' in err) {
    return new AppError('VALIDATION_ERROR', 'El cuerpo de la petición no es JSON válido');
  }
  logger.error({ err }, 'Error no controlado');
  return new AppError('INTERNAL_ERROR', 'Error interno del servidor');
}

// Express reconoce el manejador de errores por sus 4 parámetros.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = toAppError(err);
  res.status(appError.status).json({
    error: { code: appError.code, message: appError.message, details: appError.details },
  });
};
