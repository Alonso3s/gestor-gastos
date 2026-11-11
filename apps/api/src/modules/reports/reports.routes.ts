import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as reportsController from './reports.controller.js';
import { monthlyReportQuerySchema } from './reports.schemas.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get(
  '/monthly',
  validate({ query: monthlyReportQuerySchema }),
  reportsController.monthly,
);
