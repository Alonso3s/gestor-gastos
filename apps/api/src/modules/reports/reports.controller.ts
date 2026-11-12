import type { Request, Response } from 'express';
import type { MonthlyReportQuery } from './reports.schemas.js';
import * as reportsService from './reports.service.js';

export async function monthly(req: Request, res: Response): Promise<void> {
  const { month } = req.query as MonthlyReportQuery;
  res.json(await reportsService.getMonthlyReport(req.userId, month));
}
