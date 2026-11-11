# Gestor de Gastos Personales

Aplicación web para registrar gastos e ingresos, organizarlos por categoría y consultar reportes mensuales. Cada usuario se autentica con JWT y solo ve sus propios datos. Moneda única: colones (CRC).

![Dashboard con el reporte mensual](docs/capturas/dashboard.png)

|                   Transacciones                   |                 Categorías                  |               Login               |
| :-----------------------------------------------: | :-----------------------------------------: | :-------------------------------: |
| ![Transacciones](docs/capturas/transacciones.png) | ![Categorías](docs/capturas/categorias.png) | ![Login](docs/capturas/login.png) |

## Funcionalidades

- Registro, inicio y cierre de sesión. Access token de 15 min en memoria y refresh token en cookie `httpOnly` con rotación.
- Categorías propias de cada usuario, con un juego por defecto al registrarse.
- Transacciones (gasto o ingreso) con filtros por mes, tipo y categoría, y paginación.
- Reporte mensual: ingresos, gastos, balance, gasto por categoría, movimientos por día y variación del gasto contra el mes anterior.

## Stack

- **API**: Node.js 22, Express 5, TypeScript, Prisma 7, PostgreSQL 16, Zod, JWT, pino
- **Web**: React 19, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Recharts, Tailwind CSS
- **Tests**: Vitest, Supertest, Testing Library

## Requisitos

- Node.js 22 o superior
- Docker y Docker Compose (para PostgreSQL)

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
- Documentación de la API (Swagger UI): http://localhost:3000/api/docs

El seed crea un usuario de prueba con tres meses de movimientos:

| Correo            | Contraseña |
| ----------------- | ---------- |
| `demo@gastos.dev` | `demo1234` |

> Docker Compose levanta PostgreSQL con dos bases: `gastos` (desarrollo) y `gastos_test` (tests). Si ya tenías el volumen creado de antes y falta la base de pruebas, recreala con `docker compose down -v && docker compose up -d`.

## Scripts

Todos se corren desde la raíz del repositorio.

| Script               | Descripción                                 |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Levanta API y web en modo desarrollo        |
| `npm run build`      | Compila ambos proyectos                     |
| `npm run lint`       | ESLint + Prettier + chequeo de tipos        |
| `npm run format`     | Formatea el código con Prettier             |
| `npm test`           | Corre los tests de API y web                |
| `npm run db:migrate` | Aplica las migraciones de Prisma            |
| `npm run db:seed`    | Recrea el usuario demo con datos de ejemplo |

Cobertura de los services de la API: `npm run test:coverage -w @gestor-gastos/api`.

Los tests de la API son de integración: usan la base `DATABASE_URL_TEST`, aplican las migraciones solos y vacían las tablas antes de cada test. Solo necesitan que PostgreSQL esté arriba.

## Variables de entorno

Se definen en un único `.env` en la raíz (ver [`.env.example`](.env.example)).

| Variable                 | Descripción                                                | Ejemplo                                                 |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------- |
| `NODE_ENV`               | `development`, `test` o `production`                       | `development`                                           |
| `PORT`                   | Puerto de la API                                           | `3000`                                                  |
| `CORS_ORIGIN`            | Origen del frontend autorizado a llamar a la API           | `http://localhost:5173`                                 |
| `DATABASE_URL`           | Conexión a PostgreSQL                                      | `postgresql://gastos:gastos@localhost:5432/gastos`      |
| `DATABASE_URL_TEST`      | Base usada por los tests                                   | `postgresql://gastos:gastos@localhost:5432/gastos_test` |
| `JWT_ACCESS_SECRET`      | Secreto para firmar el access token (mínimo 16 caracteres) | valor largo y aleatorio                                 |
| `JWT_ACCESS_TTL`         | Duración del access token (`15m`, `1h`, …)                 | `15m`                                                   |
| `REFRESH_TOKEN_TTL_DAYS` | Días de vida del refresh token                             | `7`                                                     |
| `VITE_API_URL`           | URL de la API que usa el frontend                          | `http://localhost:3000/api`                             |

Para producción generá un secreto propio, por ejemplo con `openssl rand -base64 48`.

## API

Prefijo `/api`. Fechas `YYYY-MM-DD`, meses `YYYY-MM`, montos como string decimal. El detalle de cada endpoint, con esquemas y ejemplos, está en Swagger UI (`/api/docs`).

| Método | Ruta                                                     | Descripción                           |
| ------ | -------------------------------------------------------- | ------------------------------------- |
| POST   | `/auth/register`                                         | Crea usuario y categorías por defecto |
| POST   | `/auth/login`                                            | Inicia sesión                         |
| POST   | `/auth/refresh`                                          | Rota el refresh token                 |
| POST   | `/auth/logout`                                           | Cierra la sesión                      |
| GET    | `/auth/me`                                               | Usuario actual                        |
| GET    | `/categories?type=`                                      | Lista categorías                      |
| POST   | `/categories`                                            | Crea categoría                        |
| PATCH  | `/categories/:id`                                        | Edita nombre y/o color                |
| DELETE | `/categories/:id`                                        | Borra (409 si tiene transacciones)    |
| GET    | `/transactions?month=&categoryId=&type=&page=&pageSize=` | Lista paginada, por fecha descendente |
| GET    | `/transactions/:id`                                      | Detalle                               |
| POST   | `/transactions`                                          | Crea                                  |
| PATCH  | `/transactions/:id`                                      | Edita                                 |
| DELETE | `/transactions/:id`                                      | Borra                                 |
| GET    | `/reports/monthly?month=YYYY-MM`                         | Reporte del mes                       |
| GET    | `/health`                                                | Estado de la API                      |

Errores con formato único:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Descripción legible", "details": [] } }
```

## Estructura

```
apps/
├── api/
│   ├── prisma/            # esquema, migraciones y seed
│   ├── src/
│   │   ├── config/        # variables de entorno validadas con Zod
│   │   ├── docs/          # documento OpenAPI y Swagger UI
│   │   ├── lib/           # prisma, logger, JWT, fechas, errores
│   │   ├── middlewares/   # auth, validate, errorHandler, rate limit
│   │   └── modules/       # auth, categories, transactions, reports, health
│   └── tests/             # tests de integración con Supertest
└── web/
    └── src/
        ├── api/           # cliente HTTP y hooks de TanStack Query
        ├── components/    # componentes de UI reutilizables
        ├── features/      # auth, transactions, categories, reports
        ├── lib/           # formato de moneda y fechas, utilidades
        └── pages/
```

Cada módulo de la API sigue la cadena `routes → controller → service → Prisma`, con sus esquemas Zod en `*.schemas.ts` y su documentación en `*.openapi.ts`.

## Documentación

- [Guía de desarrollo](docs/GUIA_FABLE.md): especificación, convenciones y plan por fases.
- [Registro de decisiones](docs/decisiones.md): supuestos y decisiones tomadas durante el desarrollo.
