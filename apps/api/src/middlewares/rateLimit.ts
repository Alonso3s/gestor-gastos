import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/appError.js';

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 20;

/** Limita los intentos de login y registro por IP para frenar fuerza bruta. */
export const authRateLimit: RequestHandler = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  limit: AUTH_MAX_ATTEMPTS,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // La suite registra decenas de usuarios desde la misma IP.
  skip: () => env.NODE_ENV === 'test',
  handler: () => {
    throw new AppError('RATE_LIMITED', 'Demasiados intentos. Probá de nuevo en unos minutos');
  },
});
