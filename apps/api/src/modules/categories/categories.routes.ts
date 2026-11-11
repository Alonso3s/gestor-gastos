import { Router } from 'express';
import { idParamsSchema } from '../../lib/commonSchemas.js';
import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import * as categoriesController from './categories.controller.js';
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './categories.schemas.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get(
  '/',
  validate({ query: listCategoriesQuerySchema }),
  categoriesController.list,
);
categoriesRouter.post('/', validate({ body: createCategorySchema }), categoriesController.create);
categoriesRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateCategorySchema }),
  categoriesController.update,
);
categoriesRouter.delete('/:id', validate({ params: idParamsSchema }), categoriesController.remove);
