import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { bearer, registerUser, type TestUser } from './helpers/auth.js';
import { categoryIdByName, insertTransactions } from './helpers/data.js';
import { resetDatabaseBeforeEach } from './helpers/db.js';

const app = createApp();
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

let ana: TestUser;
let beto: TestUser;
let foodId: string;
let salaryId: string;

resetDatabaseBeforeEach();

beforeEach(async () => {
  ana = await registerUser(app, 'ana@example.com');
  beto = await registerUser(app, 'beto@example.com');
  foodId = await categoryIdByName(ana.id, 'Alimentación');
  salaryId = await categoryIdByName(ana.id, 'Salario');
});

function validExpense() {
  return {
    amount: 12500.5,
    type: 'EXPENSE',
    date: '2026-11-05',
    categoryId: foodId,
    description: 'Supermercado',
  };
}

async function createTransaction(user: TestUser, body: object = validExpense()) {
  return request(app)
    .post('/api/transactions')
    .set(...bearer(user))
    .send(body);
}

async function onlyTransactionId(userId: string): Promise<string> {
  const transaction = await prisma.transaction.findFirstOrThrow({ where: { userId } });
  return transaction.id;
}

describe('POST /api/transactions', () => {
  it('crea una transacción y devuelve el monto como string decimal', async () => {
    const res = await createTransaction(ana);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amount: '12500.50',
      type: 'EXPENSE',
      date: '2026-11-05',
      description: 'Supermercado',
      categoryId: foodId,
      category: { id: foodId, name: 'Alimentación' },
    });
  });

  it('acepta el monto como string sin perder precisión', async () => {
    const res = await createTransaction(ana, { ...validExpense(), amount: '9999999999.99' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe('9999999999.99');
  });

  it('rechaza si el tipo no coincide con el de la categoría', async () => {
    const res = await createTransaction(ana, { ...validExpense(), categoryId: salaryId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('body.categoryId');
  });

  it.each([
    ['monto en cero', { amount: 0 }],
    ['monto negativo', { amount: -5 }],
    ['monto con más de 2 decimales', { amount: '10.555' }],
    ['fecha inexistente', { date: '2026-02-30' }],
    ['fecha con otro formato', { date: '05/11/2026' }],
    ['categoría que no es UUID', { categoryId: 'abc' }],
  ])('rechaza %s', async (_caso, override) => {
    const res = await createTransaction(ana, { ...validExpense(), ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 404 si la categoría es de otro usuario', async () => {
    const res = await createTransaction(beto, validExpense());

    expect(res.status).toBe(404);
  });

  it('responde 401 sin token', async () => {
    const res = await request(app).post('/api/transactions').send(validExpense());

    expect(res.status).toBe(401);
  });
});

describe('GET /api/transactions', () => {
  beforeEach(async () => {
    await insertTransactions(ana.id, [
      { category: 'Alimentación', amount: '1000.00', date: '2026-10-31' },
      { category: 'Alimentación', amount: '2000.00', date: '2026-11-01' },
      { category: 'Transporte', amount: '3000.00', date: '2026-11-15' },
      { category: 'Salario', amount: '500000.00', date: '2026-11-30' },
      { category: 'Alimentación', amount: '4000.00', date: '2026-12-01' },
    ]);
    await insertTransactions(beto.id, [
      { category: 'Alimentación', amount: '77.00', date: '2026-11-10' },
    ]);
  });

  it('lista solo las del usuario, ordenadas por fecha descendente', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set(...bearer(ana));

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 5 });
    expect(res.body.data.map((t: { date: string }) => t.date)).toEqual([
      '2026-12-01',
      '2026-11-30',
      '2026-11-15',
      '2026-11-01',
      '2026-10-31',
    ]);
  });

  it('filtra por mes incluyendo el primer y el último día', async () => {
    const res = await request(app)
      .get('/api/transactions?month=2026-11')
      .set(...bearer(ana));

    expect(res.body.meta.total).toBe(3);
    expect(res.body.data.map((t: { date: string }) => t.date)).toEqual([
      '2026-11-30',
      '2026-11-15',
      '2026-11-01',
    ]);
  });

  it('combina filtros de mes, tipo y categoría', async () => {
    const byType = await request(app)
      .get('/api/transactions?month=2026-11&type=INCOME')
      .set(...bearer(ana));
    const byCategory = await request(app)
      .get(`/api/transactions?categoryId=${foodId}`)
      .set(...bearer(ana));

    expect(byType.body.data).toHaveLength(1);
    expect(byType.body.data[0].amount).toBe('500000.00');
    expect(byCategory.body.meta.total).toBe(3);
  });

  it('pagina los resultados', async () => {
    const res = await request(app)
      .get('/api/transactions?page=2&pageSize=2')
      .set(...bearer(ana));

    expect(res.body.meta).toEqual({ page: 2, pageSize: 2, total: 5 });
    expect(res.body.data.map((t: { date: string }) => t.date)).toEqual([
      '2026-11-15',
      '2026-11-01',
    ]);
  });

  it.each(['month=2026-13', 'month=noviembre', 'page=0', 'pageSize=101', 'type=OTRO'])(
    'rechaza la query inválida %s',
    async (query) => {
      const res = await request(app)
        .get(`/api/transactions?${query}`)
        .set(...bearer(ana));

      expect(res.status).toBe(400);
    },
  );

  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/transactions/:id', () => {
  it('devuelve el detalle de una transacción propia', async () => {
    const created = await createTransaction(ana);

    const res = await request(app)
      .get(`/api/transactions/${created.body.id}`)
      .set(...bearer(ana));

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  it('responde 404 si es de otro usuario o no existe', async () => {
    const created = await createTransaction(ana);

    const foreign = await request(app)
      .get(`/api/transactions/${created.body.id}`)
      .set(...bearer(beto));
    const unknown = await request(app)
      .get(`/api/transactions/${UNKNOWN_ID}`)
      .set(...bearer(ana));

    expect(foreign.status).toBe(404);
    expect(unknown.status).toBe(404);
  });
});

describe('PATCH /api/transactions/:id', () => {
  it('edita solo los campos enviados', async () => {
    const created = await createTransaction(ana);

    const res = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(...bearer(ana))
      .send({ amount: '300.00', date: '2026-11-20', description: null });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      amount: '300.00',
      date: '2026-11-20',
      description: null,
      categoryId: foodId,
    });
  });

  it('permite cambiar tipo y categoría juntos', async () => {
    const created = await createTransaction(ana);

    const res = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(...bearer(ana))
      .send({ type: 'INCOME', categoryId: salaryId });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'INCOME', category: { name: 'Salario' } });
  });

  it.each([
    ['solo la categoría a una de otro tipo', () => ({ categoryId: salaryId })],
    ['solo el tipo', () => ({ type: 'INCOME' })],
  ])('rechaza cambiar %s', async (_caso, body) => {
    const created = await createTransaction(ana);

    const res = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(...bearer(ana))
      .send(body());

    expect(res.status).toBe(400);
  });

  it('responde 404 si la transacción es de otro usuario', async () => {
    const created = await createTransaction(ana);

    const res = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(...bearer(beto))
      .send({ amount: 1 });

    expect(res.status).toBe(404);
  });

  it('responde 404 si la nueva categoría es de otro usuario', async () => {
    const created = await createTransaction(ana);
    const betoFoodId = await categoryIdByName(beto.id, 'Alimentación');

    const res = await request(app)
      .patch(`/api/transactions/${created.body.id}`)
      .set(...bearer(ana))
      .send({ categoryId: betoFoodId });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('borra una transacción propia', async () => {
    await createTransaction(ana);
    const id = await onlyTransactionId(ana.id);

    const res = await request(app)
      .delete(`/api/transactions/${id}`)
      .set(...bearer(ana));

    expect(res.status).toBe(204);
    expect(await prisma.transaction.count()).toBe(0);
  });

  it('responde 404 y no borra si es de otro usuario', async () => {
    await createTransaction(ana);
    const id = await onlyTransactionId(ana.id);

    const res = await request(app)
      .delete(`/api/transactions/${id}`)
      .set(...bearer(beto));

    expect(res.status).toBe(404);
    expect(await prisma.transaction.count()).toBe(1);
  });
});
