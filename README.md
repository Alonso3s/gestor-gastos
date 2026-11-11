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

## Scripts

| Script               | Descripción                                |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Levanta API y web en modo desarrollo       |
| `npm run build`      | Compila ambos proyectos                    |
| `npm run lint`       | ESLint + Prettier + chequeo de tipos       |
| `npm run format`     | Formatea el código con Prettier            |
| `npm test`           | Corre los tests de API y web               |
| `npm run db:migrate` | Aplica las migraciones de Prisma           |
| `npm run db:seed`    | Carga el usuario demo con datos de ejemplo |

## Documentación

- [Guía de desarrollo](docs/GUIA_FABLE.md)
- [Registro de decisiones](docs/decisiones.md)
