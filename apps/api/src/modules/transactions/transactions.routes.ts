import { Router } from 'express';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as transactionsController from './transactions.controller.js';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from './transactions.schemas.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

transactionsRouter.get(
  '/',
  validate({ query: listTransactionsQuerySchema }),
  transactionsController.list,
);
transactionsRouter.get(
  '/:id',
  validate({ params: idParamsSchema }),
  transactionsController.getById,
);
transactionsRouter.post(
  '/',
  validate({ body: createTransactionSchema }),
  transactionsController.create,
);
transactionsRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateTransactionSchema }),
  transactionsController.update,
);
transactionsRouter.delete(
  '/:id',
  validate({ params: idParamsSchema }),
  transactionsController.remove,
);
