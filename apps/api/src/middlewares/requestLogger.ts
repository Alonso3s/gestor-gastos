import type { RequestHandler } from 'express';
import { logger } from '../lib/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      },
      'request',
    );
  });
  next();
};
