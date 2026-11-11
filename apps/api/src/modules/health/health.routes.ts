import { Router } from 'express';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';

const SERVICE_UNAVAILABLE = 503;

export const healthRouter = Router();

// Responde con su propio formato (no el de error de la API): lo consume el healthcheck de Docker.
healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error({ err }, 'Health check: la base de datos no responde');
    res.status(SERVICE_UNAVAILABLE).json({ status: 'error' });
  }
});
