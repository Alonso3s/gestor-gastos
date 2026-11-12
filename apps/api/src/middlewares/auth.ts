import type { RequestHandler } from 'express';
import { AppError } from '../lib/appError.js';
import { verifyAccessToken } from '../lib/jwt.js';

const BEARER_PREFIX = 'Bearer ';

/** Exige un access token válido y deja el id del usuario en `req.userId`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : null;
  const userId = token ? verifyAccessToken(token) : null;

  if (!userId) throw new AppError('UNAUTHORIZED', 'Token de acceso inválido o ausente');

  req.userId = userId;
  next();
};
