import type { Request, Response } from 'express';
import type { IdParams } from '../../lib/commonSchemas.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from './transactions.schemas.js';
import * as transactionsService from './transactions.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  // Tras `validate`, la query ya no es el `ParsedQs` original sino el objeto parseado.
  const query = req.query as unknown as ListTransactionsQuery;
  res.json(await transactionsService.listTransactions(req.userId, query));
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  res.json(await transactionsService.getTransaction(req.userId, id));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateTransactionInput;
  res.status(201).json(await transactionsService.createTransaction(req.userId, input));
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  const input = req.body as UpdateTransactionInput;
  res.json(await transactionsService.updateTransaction(req.userId, id, input));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params as IdParams;
  await transactionsService.deleteTransaction(req.userId, id);
  res.status(204).end();
}
