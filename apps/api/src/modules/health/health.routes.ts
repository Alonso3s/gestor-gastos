import { Router } from 'express';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';

export const healthRouter = Router();

// Docker usa esta ruta como healthcheck: también comprueba que la base responda.
healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'La base de datos no responde');
    res.status(503).json({ status: 'error' });
  }
});
