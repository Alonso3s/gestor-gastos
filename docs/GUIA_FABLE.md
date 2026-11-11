# Guía de desarrollo — Gestor de Gastos Personales

> Documento maestro para el agente (Claude Fable). Leelo completo antes de escribir código.
> Si algo de esta guía choca con una petición puntual del usuario, preguntá antes de decidir.

## 1. Objetivo

Aplicación web para registrar gastos e ingresos personales, organizarlos por categoría y ver **reportes mensuales**. Cada usuario se autentica con **JWT** y solo ve sus propios datos.

**Prioridades, en este orden:**
1. Código limpio y legible.
2. Documentación clara (README, comentarios donde aporten, OpenAPI).
3. Funcionalidad completa del alcance definido aquí. Nada más.

## 2. Alcance

### Incluido (MVP)
- Registro, login, refresh de token y logout.
- CRUD de **categorías** (propias de cada usuario, con categorías por defecto al registrarse).
- CRUD de **transacciones** (gasto o ingreso) con filtros por mes, categoría y tipo, y paginación.
- **Reporte mensual**: total de ingresos, total de gastos, balance, gasto por categoría y gasto por día.
- Comparación con el mes anterior (variación porcentual del gasto).
- Frontend con login, dashboard del mes, lista de transacciones y gestión de categorías.

### Fuera de alcance (no implementar sin que se pida)
- Multimoneda, presupuestos, transacciones recurrentes, adjuntos, OAuth/Google, notificaciones, exportar PDF/Excel, modo multiusuario compartido.

## 3. Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 LTS |
| Lenguaje | TypeScript (modo `strict`) en backend y frontend |
| API | Express 5 |
| ORM | Prisma |
| Base de datos | PostgreSQL 16 (Docker Compose) |
| Auth | `jsonwebtoken` + `bcrypt` |
| Validación | Zod (esquemas compartidos entre validación y tipos) |
| Logs | pino |
| Docs API | OpenAPI 3 generado desde Zod (`@asteasolutions/zod-to-openapi`) + Swagger UI en `/api/docs` |
| Frontend | React 19 + Vite + React Router + TanStack Query |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts |
| Estilos | Tailwind CSS |
| Tests | Vitest + Supertest (backend), Vitest + Testing Library (frontend) |
| Calidad | ESLint + Prettier, `npm workspaces` |

Antes de instalar, verificá las versiones estables actuales de cada paquete. No agregues dependencias fuera de esta tabla sin justificarlo en el PR/commit.

## 4. Estructura del repositorio

```
gestor-gastos/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── config/          # env validado con Zod
│   │   │   ├── lib/             # prisma client, logger, jwt helpers
│   │   │   ├── middlewares/     # auth, errorHandler, validate
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # routes, controller, service, schemas
│   │   │   │   ├── categories/
│   │   │   │   ├── transactions/
│   │   │   │   └── reports/
│   │   │   ├── app.ts           # arma Express (sin listen)
│   │   │   └── server.ts        # listen
│   │   └── tests/
│   └── web/
│       └── src/
│           ├── api/             # cliente HTTP y hooks de TanStack Query
│           ├── components/
│           ├── features/        # auth, transactions, categories, reports
│           ├── pages/
│           └── main.tsx
├── docs/
│   ├── GUIA_FABLE.md            # este archivo
│   └── decisiones.md            # registro de decisiones (ADR corto)
├── docker-compose.yml
├── .env.example
└── package.json                 # workspaces
```

**Regla por módulo del backend:** `*.routes.ts` → `*.controller.ts` → `*.service.ts` → Prisma.
- Routes: solo rutas y middlewares.
- Controller: lee `req`, llama al service, responde. Sin lógica de negocio.
- Service: lógica de negocio y acceso a datos. No conoce Express.
- Schemas (`*.schemas.ts`): esquemas Zod de entrada/salida y sus tipos inferidos.

## 5. Modelo de datos

```prisma
model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  name         String
  createdAt    DateTime      @default(now())
  categories   Category[]
  transactions Transaction[]
  refreshTokens RefreshToken[]
}

model Category {
  id           String          @id @default(uuid())
  name         String
  type         TransactionType
  color        String          @default("#64748b")
  userId       String
  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@unique([userId, name, type])
}

model Transaction {
  id          String          @id @default(uuid())
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?
  date        DateTime        @db.Date
  categoryId  String
  category    Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([userId, date])
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

**Reglas de negocio:**
- `amount` siempre positivo; el signo lo da `type`.
- El `type` de la transacción debe coincidir con el `type` de su categoría.
- No se puede borrar una categoría con transacciones (responder `409`).
- Moneda única: colones (CRC). Formatear en el frontend con `Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' })`.
- Montos: usar `Decimal` en BD y nunca sumar con `number` de JS en el backend; agregar con SQL/Prisma.
- Categorías por defecto al registrarse: Gastos → Alimentación, Transporte, Vivienda, Servicios, Salud, Entretenimiento, Educación, Otros. Ingresos → Salario, Otros ingresos.

## 6. Autenticación JWT

- **Access token**: 15 min, firmado con `JWT_ACCESS_SECRET`, payload `{ sub: userId }`. Se envía en `Authorization: Bearer <token>`.
- **Refresh token**: 7 días, valor aleatorio (`crypto.randomBytes`), guardado **hasheado** en `RefreshToken`. Viaja en cookie `httpOnly`, `secure` en producción, `sameSite=strict`, path `/api/auth`.
- **Rotación**: cada `/refresh` revoca el token usado y emite uno nuevo. Si llega un token ya revocado, revocar todos los del usuario (posible robo).
- Contraseñas con `bcrypt` (cost 12). Mínimo 8 caracteres.
- Middleware `requireAuth` agrega `req.userId`. **Toda consulta de datos filtra por `userId`**; si un recurso no pertenece al usuario, responder `404` (no `403`, para no revelar existencia).
- Rate limit en `/api/auth/login` y `/api/auth/register` (`express-rate-limit`).
- El frontend guarda el access token **en memoria** (no en localStorage) y lo renueva con `/refresh` al recibir `401`.

## 7. API REST

Prefijo `/api`. Respuestas JSON. Fechas en ISO `YYYY-MM-DD`. Meses como `YYYY-MM`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea usuario + categorías por defecto. Devuelve access token. |
| POST | `/auth/login` | Devuelve access token y setea cookie de refresh. |
| POST | `/auth/refresh` | Rota refresh token, devuelve nuevo access token. |
| POST | `/auth/logout` | Revoca refresh token y limpia cookie. |
| GET | `/auth/me` | Usuario actual. |
| GET | `/categories?type=` | Lista categorías del usuario. |
| POST | `/categories` | Crea categoría. |
| PATCH | `/categories/:id` | Edita categoría. |
| DELETE | `/categories/:id` | Borra (409 si tiene transacciones). |
| GET | `/transactions?month=&categoryId=&type=&page=&pageSize=` | Lista paginada, orden por fecha desc. |
| GET | `/transactions/:id` | Detalle. |
| POST | `/transactions` | Crea. |
| PATCH | `/transactions/:id` | Edita. |
| DELETE | `/transactions/:id` | Borra. |
| GET | `/reports/monthly?month=YYYY-MM` | Reporte del mes (ver abajo). |
| GET | `/health` | Estado de la API. |

**Formato de error único:**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Descripción legible", "details": [] } }
```
Códigos: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500). Un solo `errorHandler` central; los services lanzan `AppError(code, message)`.

**Lista paginada:**
```json
{ "data": [], "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```

## 8. Reporte mensual

`GET /reports/monthly?month=2026-11` responde:

```json
{
  "month": "2026-11",
  "totals": { "income": "450000.00", "expense": "312500.50", "balance": "137499.50" },
  "previousMonth": { "expense": "290000.00", "expenseChangePct": 7.76 },
  "byCategory": [
    { "categoryId": "…", "name": "Alimentación", "color": "#22c55e", "total": "120000.00", "pct": 38.4 }
  ],
  "byDay": [ { "date": "2026-11-01", "expense": "15000.00", "income": "0.00" } ]
}
```

- Montos como **string decimal** para no perder precisión.
- Agregaciones con `prisma.transaction.groupBy` o `$queryRaw` parametrizado; nunca traer todas las filas para sumar en memoria.
- `byDay` incluye todos los días del mes (con 0 si no hubo movimientos).
- `expenseChangePct` es `null` si el mes anterior tuvo 0 gastos.
- Rango del mes: `[primer día, primer día del mes siguiente)`.

Frontend del dashboard: tarjetas de totales, gráfico de dona por categoría, barras por día, selector de mes.

## 9. Convenciones de código limpio

- **Idioma**: código (variables, funciones, rutas) en inglés; textos de UI, docs y mensajes de commit en español.
- **Nombres**: `camelCase` variables/funciones, `PascalCase` tipos/componentes, `kebab-case` archivos del frontend excepto componentes (`TransactionForm.tsx`).
- Funciones cortas con una sola responsabilidad. Si pasa de ~40 líneas, dividir.
- Sin `any`. Sin `// @ts-ignore`. Tipos inferidos de Zod en lugar de duplicarlos.
- Sin números mágicos: constantes con nombre (`ACCESS_TOKEN_TTL`).
- Variables de entorno solo a través de `src/config/env.ts` (validado con Zod al arrancar).
- `async/await`, nunca callbacks. Errores con `AppError`, nunca `res.status(500)` sueltos.
- Comentarios: explicar **por qué**, no **qué**. JSDoc solo en funciones públicas de services y utilidades.
- Sin código muerto, sin `console.log` (usar el logger).
- Componentes React: presentacionales sin fetch; los datos vienen de hooks en `src/api`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/es/) en español: `feat(transactions): agrega filtro por mes`.

## 10. Variables de entorno

Ver `.env.example`. Ninguna clave real en el repo.

## 11. Plan de trabajo por fases

Completá una fase, corré lint + tests, hacé commit y recién entonces pasá a la siguiente. Al terminar cada fase, resumí en 3–5 líneas qué se hizo y qué queda.

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| 0. Base | Workspaces, TS, ESLint, Prettier, Docker Compose con Postgres, `/health` | `npm run dev` levanta API y web; `/api/health` responde 200 |
| 1. Datos | `schema.prisma`, migración inicial, seed con usuario demo | `npx prisma migrate dev` sin errores; seed crea datos de 3 meses |
| 2. Auth | register, login, refresh, logout, me, `requireAuth` | Tests: registro, login inválido, refresh con rotación, token reusado revoca todo |
| 3. Categorías | CRUD + validaciones | Tests: aislamiento entre usuarios, 409 al borrar con transacciones |
| 4. Transacciones | CRUD + filtros + paginación | Tests: tipo debe coincidir con categoría, filtros por mes |
| 5. Reportes | `/reports/monthly` | Tests con datos fijos verifican totales, % y días con 0 |
| 6. Docs API | OpenAPI + Swagger UI | `/api/docs` muestra todos los endpoints con ejemplos |
| 7. Frontend auth | Login, registro, refresh automático, rutas protegidas | Recargar la página mantiene la sesión vía refresh |
| 8. Frontend CRUD | Transacciones y categorías | Crear/editar/borrar con feedback y validación de formularios |
| 9. Dashboard | Reporte mensual con gráficos | Cambiar de mes actualiza todo; estados de carga y vacío |
| 10. Cierre | README final, capturas, `docs/decisiones.md` | Alguien nuevo levanta el proyecto siguiendo solo el README |

## 12. Pruebas

- Backend: tests de integración con Supertest contra una BD de prueba (`DATABASE_URL` de test, limpiar tablas entre tests).
- Cubrir siempre: caso feliz, validación fallida, acceso sin token, acceso a recurso de otro usuario.
- Frontend: tests de los formularios y del hook de refresh.
- Meta: cobertura ≥ 80 % en `services`.

## 13. Reglas para el agente

1. No inventes requisitos. Si falta información, preguntá o anotá el supuesto en `docs/decisiones.md`.
2. No cambies el stack ni la estructura sin proponerlo primero.
3. Cada cambio debe pasar `npm run lint` y `npm test` antes del commit.
4. Mantené el README actualizado cuando agregues scripts, variables o endpoints.
5. Preferí la solución más simple que cumpla el criterio de aceptación.
6. Nunca subas `.env`, secretos ni tokens.
