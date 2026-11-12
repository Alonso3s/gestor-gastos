import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { bearer, registerUser, type TestUser } from './helpers/auth.js';
import { insertTransactions } from './helpers/data.js';
import { resetDatabaseBeforeEach } from './helpers/db.js';

const app = createApp();

let ana: TestUser;
let beto: TestUser;

resetDatabaseBeforeEach();

beforeEach(async () => {
  ana = await registerUser(app, 'ana@example.com');
  beto = await registerUser(app, 'beto@example.com');
});

function getReport(user: TestUser, month: string) {
  return request(app)
    .get(`/api/reports/monthly?month=${month}`)
    .set(...bearer(user));
}

describe('GET /api/reports/monthly', () => {
  beforeEach(async () => {
    await insertTransactions(ana.id, [
      // Octubre: mes anterior. El día 31 no debe colarse en noviembre.
      { category: 'Alimentación', amount: '250000.00', date: '2026-10-10' },
      { category: 'Transporte', amount: '40000.00', date: '2026-10-31' },
      // Noviembre: mes del reporte, con movimientos en el primer y el último día.
      { category: 'Salario', amount: '450000.00', date: '2026-11-01' },
      { category: 'Alimentación', amount: '100000.25', date: '2026-11-01' },
      { category: 'Alimentación', amount: '20000.25', date: '2026-11-15' },
      { category: 'Transporte', amount: '180000.00', date: '2026-11-15' },
      { category: 'Salud', amount: '12500.00', date: '2026-11-30' },
      // Diciembre: no debe contarse.
      { category: 'Alimentación', amount: '999.00', date: '2026-12-01' },
    ]);
    await insertTransactions(beto.id, [
      { category: 'Alimentación', amount: '5000000.00', date: '2026-11-15' },
    ]);
  });

  it('calcula ingresos, gastos y balance del mes', async () => {
    const res = await getReport(ana, '2026-11');

    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2026-11');
    expect(res.body.totals).toEqual({
      income: '450000.00',
      expense: '312500.50',
      balance: '137499.50',
    });
  });

  it('compara el gasto con el mes anterior', async () => {
    const res = await getReport(ana, '2026-11');

    // (312500.50 − 290000) / 290000 = 7.7588… %
    expect(res.body.previousMonth).toEqual({ expense: '290000.00', expenseChangePct: 7.76 });
  });

  it('agrupa el gasto por categoría, de mayor a menor, con su porcentaje', async () => {
    const res = await getReport(ana, '2026-11');

    expect(res.body.byCategory).toEqual([
      expect.objectContaining({ name: 'Transporte', total: '180000.00', pct: 57.6 }),
      expect.objectContaining({ name: 'Alimentación', total: '120000.50', pct: 38.4 }),
      expect.objectContaining({ name: 'Salud', total: '12500.00', pct: 4 }),
    ]);
    expect(res.body.byCategory[0]).toEqual({
      categoryId: expect.any(String),
      name: 'Transporte',
      color: '#3b82f6',
      total: '180000.00',
      pct: 57.6,
    });
  });

  it('incluye todos los días del mes, con 0 donde no hubo movimientos', async () => {
    const res = await getReport(ana, '2026-11');
    const byDay: { date: string; expense: string; income: string }[] = res.body.byDay;

    expect(byDay).toHaveLength(30);
    expect(byDay[0]).toEqual({ date: '2026-11-01', expense: '100000.25', income: '450000.00' });
    expect(byDay[1]).toEqual({ date: '2026-11-02', expense: '0.00', income: '0.00' });
    expect(byDay[14]).toEqual({ date: '2026-11-15', expense: '200000.25', income: '0.00' });
    expect(byDay[29]).toEqual({ date: '2026-11-30', expense: '12500.00', income: '0.00' });
  });

  it('devuelve expenseChangePct null si el mes anterior no tuvo gastos', async () => {
    const res = await getReport(ana, '2026-10');

    expect(res.body.totals.expense).toBe('290000.00');
    expect(res.body.previousMonth).toEqual({ expense: '0.00', expenseChangePct: null });
  });

  it('devuelve una variación negativa cuando el gasto baja', async () => {
    const res = await getReport(ana, '2026-12');

    expect(res.body.previousMonth).toEqual({ expense: '312500.50', expenseChangePct: -99.68 });
  });

  it('devuelve un reporte en cero para un mes sin movimientos', async () => {
    const res = await getReport(ana, '2024-02');

    expect(res.body.totals).toEqual({ income: '0.00', expense: '0.00', balance: '0.00' });
    expect(res.body.byCategory).toEqual([]);
    // Febrero de un año bisiesto.
    expect(res.body.byDay).toHaveLength(29);
  });

  it('calcula el mes anterior cruzando de año', async () => {
    await insertTransactions(ana.id, [
      { category: 'Salud', amount: '100.00', date: '2026-12-20' },
      { category: 'Salud', amount: '150.00', date: '2027-01-05' },
    ]);

    const res = await getReport(ana, '2027-01');

    expect(res.body.previousMonth).toEqual({ expense: '1099.00', expenseChangePct: -86.35 });
  });

  it('no mezcla datos de otros usuarios', async () => {
    const res = await getReport(beto, '2026-11');

    expect(res.body.totals).toEqual({
      income: '0.00',
      expense: '5000000.00',
      balance: '-5000000.00',
    });
    expect(res.body.byCategory).toHaveLength(1);
  });

  it.each(['', '2026-13', '2026-1', 'noviembre'])('rechaza el mes inválido "%s"', async (month) => {
    const res = await getReport(ana, month);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/reports/monthly?month=2026-11');

    expect(res.status).toBe(401);
  });
});
