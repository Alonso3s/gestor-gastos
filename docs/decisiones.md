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
