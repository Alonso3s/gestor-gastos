import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { DEFAULT_CATEGORIES } from '../src/modules/categories/defaultCategories.js';
import { bearer, registerUser, type TestUser } from './helpers/auth.js';
import { resetDatabaseBeforeEach } from './helpers/db.js';

const app = createApp();
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

let ana: TestUser;
let beto: TestUser;

resetDatabaseBeforeEach();

beforeEach(async () => {
  ana = await registerUser(app, 'ana@example.com');
  beto = await registerUser(app, 'beto@example.com');
});

async function createCategory(user: TestUser, name = 'Mascotas') {
  const res = await request(app)
    .post('/api/categories')
    .set(...bearer(user))
    .send({ name, type: 'EXPENSE', color: '#112233' });
  return res.body as { id: string };
}

describe('GET /api/categories', () => {
  it('lista solo las categorías del usuario autenticado', async () => {
    await createCategory(beto, 'Solo de Beto');

    const res = await request(app)
      .get('/api/categories')
      .set(...bearer(ana));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(res.body.map((c: { name: string }) => c.name)).not.toContain('Solo de Beto');
  });

  it('filtra por tipo', async () => {
    const res = await request(app)
      .get('/api/categories?type=INCOME')
      .set(...bearer(ana));

    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['Otros ingresos', 'Salario']);
  });

  it('rechaza un tipo inválido', async () => {
    const res = await request(app)
      .get('/api/categories?type=OTRO')
      .set(...bearer(ana));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/categories', () => {
  it('crea una categoría con color por defecto', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(...bearer(ana))
      .send({ name: '  Mascotas ', type: 'EXPENSE' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Mascotas',
      type: 'EXPENSE',
      color: '#64748b',
    });
  });

  it('rechaza nombre vacío y color inválido', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(...bearer(ana))
      .send({ name: ' ', type: 'EXPENSE', color: 'rojo' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveLength(2);
  });

  it('responde 409 si ya existe una con el mismo nombre y tipo', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set(...bearer(ana))
      .send({ name: 'Salud', type: 'EXPENSE' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('permite el mismo nombre a usuarios distintos', async () => {
    await createCategory(ana, 'Mascotas');

    const res = await request(app)
      .post('/api/categories')
      .set(...bearer(beto))
      .send({ name: 'Mascotas', type: 'EXPENSE' });

    expect(res.status).toBe(201);
  });
});

describe('PATCH /api/categories/:id', () => {
  it('edita nombre y color', async () => {
    const category = await createCategory(ana);

    const res = await request(app)
      .patch(`/api/categories/${category.id}`)
      .set(...bearer(ana))
      .send({ name: 'Perros', color: '#abcdef' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Perros', color: '#abcdef', type: 'EXPENSE' });
  });

  it('rechaza un cuerpo sin campos', async () => {
    const category = await createCategory(ana);

    const res = await request(app)
      .patch(`/api/categories/${category.id}`)
      .set(...bearer(ana))
      .send({});

    expect(res.status).toBe(400);
  });

  it('responde 409 si el nuevo nombre ya existe', async () => {
    const category = await createCategory(ana);

    const res = await request(app)
      .patch(`/api/categories/${category.id}`)
      .set(...bearer(ana))
      .send({ name: 'Salud' });

    expect(res.status).toBe(409);
  });

  it('responde 404 si la categoría es de otro usuario o no existe', async () => {
    const category = await createCategory(beto);

    const foreign = await request(app)
      .patch(`/api/categories/${category.id}`)
      .set(...bearer(ana))
      .send({ name: 'Hackeada' });
    const unknown = await request(app)
      .patch(`/api/categories/${UNKNOWN_ID}`)
      .set(...bearer(ana))
      .send({ name: 'Nada' });

    expect(foreign.status).toBe(404);
    expect(unknown.status).toBe(404);
    const untouched = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(untouched.name).toBe('Mascotas');
  });
});

describe('DELETE /api/categories/:id', () => {
  it('borra una categoría sin transacciones', async () => {
    const category = await createCategory(ana);

    const res = await request(app)
      .delete(`/api/categories/${category.id}`)
      .set(...bearer(ana));

    expect(res.status).toBe(204);
    expect(await prisma.category.findUnique({ where: { id: category.id } })).toBeNull();
  });

  it('responde 409 si la categoría tiene transacciones', async () => {
    const category = await createCategory(ana);
    await prisma.transaction.create({
      data: {
        userId: ana.id,
        categoryId: category.id,
        type: 'EXPENSE',
        amount: '1500.00',
        date: new Date('2026-11-05'),
      },
    });

    const res = await request(app)
      .delete(`/api/categories/${category.id}`)
      .set(...bearer(ana));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('responde 404 si la categoría es de otro usuario', async () => {
    const category = await createCategory(beto);

    const res = await request(app)
      .delete(`/api/categories/${category.id}`)
      .set(...bearer(ana));

    expect(res.status).toBe(404);
    expect(await prisma.category.findUnique({ where: { id: category.id } })).not.toBeNull();
  });

  it('rechaza un id que no es UUID', async () => {
    const res = await request(app)
      .delete('/api/categories/123')
      .set(...bearer(ana));

    expect(res.status).toBe(400);
  });
});
