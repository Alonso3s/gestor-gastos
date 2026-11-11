import type { Request, Response } from 'express';
import type { IdParams } from '../../lib/commonSchemas.js';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from './categories.schemas.js';
import * as categoriesService from './categories.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as ListCategoriesQuery;
  res.json(await categoriesService.listCategories(req.userId, query));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateCategoryInput;
  res.status(201).json(await categoriesService.createCategory(req.userId, input));
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const input = req.body as UpdateCategoryInput;
  res.json(await categoriesService.updateCategory(req.userId, id, input));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  await categoriesService.deleteCategory(req.userId, id);
  res.status(204).end();
}
