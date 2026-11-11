# Gestor de Gastos Personales

Aplicación web para registrar gastos e ingresos, organizarlos por categoría y consultar reportes mensuales. Autenticación con JWT.

> Estado: en desarrollo. La especificación completa está en [`docs/GUIA_FABLE.md`](docs/GUIA_FABLE.md).

## Stack

- **API**: Node.js 22, Express, TypeScript, Prisma, PostgreSQL, Zod, JWT
- **Web**: React, Vite, TypeScript, TanStack Query, Recharts, Tailwind CSS
- **Tests**: Vitest, Supertest, Testing Library

## Funcionalidades

- Registro e inicio de sesión (access + refresh token con rotación)
- CRUD de categorías y transacciones
- Reporte mensual: ingresos, gastos, balance, gasto por categoría y por día, comparación con el mes anterior

## Requisitos

- Node.js 22+
- Docker y Docker Compose

## Puesta en marcha

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/api
- Docs API: http://localhost:3000/api/docs

> Los scripts se crean en la fase 0 del plan de trabajo.

## Documentación

- [Guía de desarrollo](docs/GUIA_FABLE.md)
- [Registro de decisiones](docs/decisiones.md)
