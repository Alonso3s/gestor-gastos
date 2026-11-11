import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import { env } from './config/env.js';
import { docsRouter } from './docs/docs.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';

function createApiRouter(): Router {
  const api = Router();
  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  api.use('/categories', categoriesRouter);
  api.use('/transactions', transactionsRouter);
  api.use('/reports', reportsRouter);
  api.use('/docs', docsRouter);
  return api;
}

/** Arma la aplicación Express sin abrir el puerto, para poder usarla en los tests. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Detrás de un proxy, `req.ip` sale de `X-Forwarded-For`; si no, el rate limit vería a todos con la misma IP.
  app.set('trust proxy', env.TRUST_PROXY);
  // `credentials` permite que el navegador envíe la cookie del refresh token.
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(requestLogger);

  app.use('/api', createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
