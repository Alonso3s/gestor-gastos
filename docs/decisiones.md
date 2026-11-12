# Registro de decisiones

Formato: fecha — decisión — motivo.

- 2026-11-11 — Stack Node + Express + Prisma + PostgreSQL y React + Vite, todo en TypeScript — un solo lenguaje, tipos compartidos y buena documentación para trabajar con un agente.
- 2026-11-11 — Refresh token en cookie httpOnly y access token en memoria — evita exponer tokens a XSS vía localStorage.
- 2026-11-11 — Moneda única CRC — fuera de alcance el multimoneda en el MVP.
- 2026-11-11 — TypeScript 6.0.x en lugar de 7.x — `typescript-eslint` todavía no soporta TypeScript 7 (`peerDependencies: <6.1.0`).
- 2026-11-11 — Prisma 7.x (etiqueta `prev`) en lugar de `latest` — al momento de instalar, `latest` apunta a una _release candidate_ (8.0.0-rc) y la guía pide versiones estables.
- 2026-11-11 — Dependencias fuera de la tabla del stack: `cors` y `cookie-parser` (CORS con credenciales y lectura de la cookie de refresh), `tsx` (ejecutar TypeScript en desarrollo y en el seed), `concurrently` (levantar API y web con un solo `npm run dev`). En el frontend, `@vitejs/plugin-react`, `@tailwindcss/vite` y `jsdom` son los complementos oficiales de Vite, Tailwind y Vitest.
- 2026-11-11 — Un solo `.env` en la raíz, cargado con `--env-file` de Node (sin `dotenv`) y con `envDir` en Vite — una sola fuente de configuración y una dependencia menos.
- 2026-11-11 — Los tests usan `.env` y, si no existe, `.env.example` — permite correr `npm test` en un clon recién hecho con solo levantar Docker Compose.
- 2026-11-11 — Log de peticiones con un middleware propio sobre `pino` en vez de `pino-http` — son 15 líneas y evita otra dependencia.
- 2026-11-11 — `docker/init-test-db.sql` crea la base `gastos_test` al inicializar el contenedor — los tests de integración necesitan una base separada de la de desarrollo.
- 2026-11-11 — `@prisma/adapter-pg` como dependencia adicional — Prisma 7 exige un _driver adapter_ para conectarse a PostgreSQL.
- 2026-11-11 — El cliente de Prisma se genera en `apps/api/src/generated` (ignorado por git) y se regenera en `postinstall` — es código derivado del esquema.
- 2026-11-11 — Usuario demo del seed: `demo@gastos.dev` / `demo1234`. El seed es idempotente: borra y recrea solo a ese usuario.
- 2026-11-11 — `POST /auth/register` también setea la cookie de refresh (además de devolver el access token) — así el usuario queda con sesión iniciada tras registrarse, igual que con login.
- 2026-11-11 — El refresh token se guarda como SHA-256 (no bcrypt) — es un valor aleatorio de 48 bytes, no una contraseña: un hash rápido es suficiente y permite buscarlo por índice único.
- 2026-11-11 — Rate limit de auth: 20 intentos por IP cada 15 minutos; desactivado con `NODE_ENV=test`. En tests bcrypt usa costo 4 (12 en el resto) para que la suite sea rápida.
- 2026-11-11 — `validate` reemplaza `req.body/query/params` por los datos parseados y los controllers los leen con el tipo inferido de Zod.
- 2026-11-11 — El tipo de una categoría no se puede editar (`PATCH` solo acepta `name` y `color`) — cambiarlo dejaría transacciones con un tipo distinto al de su categoría.
- 2026-11-11 — `amount` se acepta como número o string decimal (hasta 10 enteros y 2 decimales) y siempre se responde como string — evita perder precisión con `number` de JS.
- 2026-11-11 — Las transacciones incluyen `category: { id, name, color }` en la respuesta — la lista del frontend no necesita una segunda consulta para mostrar la categoría.
- 2026-11-11 — En el reporte, `pct` por categoría se redondea a 1 decimal y `expenseChangePct` a 2, como en el ejemplo de la guía; `byCategory` va ordenado de mayor a menor gasto.
- 2026-11-11 — La documentación OpenAPI se registra en un `*.openapi.ts` por módulo, con los mismos esquemas Zod que validan la API; los ejemplos van a nivel de endpoint. El JSON crudo queda en `/api/docs/openapi.json`.
- 2026-11-11 — El frontend define sus propios tipos de respuesta y esquemas de formulario en vez de importar los del backend — compartirlos exigiría un tercer paquete en el monorepo, fuera de la estructura de la guía.
- 2026-11-11 — La sesión del frontend es una query de TanStack Query (`useSession`) que se resuelve con `/auth/refresh` al cargar — deduplica la petición (el refresh token rota en cada uso) y evita un contexto de auth aparte.
- 2026-11-11 — Rutas del frontend en español (`/login`, `/registro`, `/transacciones`, `/categorias`) — son texto visible para el usuario.
- 2026-11-11 — Feedback de las acciones con un aviso temporal en la página, sin librería de _toasts_ — alcanza para el MVP.
- 2026-11-11 — Despliegue en VM Always Free de Oracle con la cuenta en Pay As You Go y alerta de presupuesto de $1 — evita que Oracle reclame la VM por baja actividad; los recursos gratis siguen sin costo.
- 2026-11-11 — Margen de 10 s antes de tratar como robo un refresh token reusado — varias pestañas comparten la cookie y pueden rotarla casi a la vez.
- 2026-11-11 — Registro sin búsqueda previa del correo; el índice único decide y se responde 409 — elimina la carrera que devolvía 500.
- 2026-11-11 — Se borran los refresh tokens vencidos del usuario al emitir uno nuevo — evita que la tabla crezca sin límite, sin agregar un cron.
- 2026-11-11 — `TRUST_PROXY` configurable (0 por defecto, 1 en producción detrás de Caddy) — el rate limit necesita la IP real del cliente.
- 2026-11-11 — La API y Prisma arrancan sin archivo `.env` en producción — en Docker las variables llegan por el entorno.
- 2026-11-11 — El frontend se compila con `VITE_API_URL=/api` y se sirve en el mismo dominio que la API — la cookie `sameSite=strict` no viaja entre dominios.
- 2026-11-11 — `/api/health` consulta la base y responde 503 si falla — Docker lo usa como healthcheck.
- 2026-11-11 — El generador de Prisma declara `moduleFormat` e `importFileExtension` — sin tsconfig a la vista (Docker) generaba imports `.ts` y la API no arrancaba.
