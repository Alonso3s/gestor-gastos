# Guía de despliegue — Gestor de Gastos en Oracle Cloud

> Documento para el agente (Claude Fable). Leelo completo antes de tocar código.
> Complementa a `docs/GUIA_FABLE.md`: las convenciones de código, pruebas y commits de esa guía siguen vigentes.
> Trabajá sobre la rama `desarrollo`, fase por fase, con `npm run lint` y `npm test` en verde antes de cada commit.

## 1. Objetivo

Publicar la app en internet para **al menos 4 usuarios**, con respuestas rápidas, sin costo y sin que el servidor "se duerma".

**Arquitectura elegida:** una VM gratis de Oracle Cloud (Always Free, Arm/Ampere A1, Ubuntu 24.04) con Docker Compose:

```
Internet ──HTTPS──► Caddy (:80/:443)
                     ├── /api/*  ──► api (Node, :3000) ──► db (PostgreSQL 16, red interna)
                     └── /*      ──► archivos estáticos del frontend (build de Vite)
```

- **Un solo dominio** para frontend y API. Es obligatorio: la cookie del refresh token es `sameSite: 'strict'` y no viaja entre dominios distintos.
- Caddy obtiene y renueva el certificado HTTPS solo (Let's Encrypt).
- Dominio gratis con DuckDNS (`<nombre>.duckdns.org`).
- PostgreSQL **no** se expone a internet.

**Fuera de alcance:** Kubernetes, balanceadores, CDN, múltiples VMs, servicios administrados de base de datos, monitoreo pago.

## 2. Fase A — Correcciones de código (antes de desplegar)

Salen de una revisión del código. Cada una lleva su prueba. Un commit por punto.

### A1. Varias pestañas cierran la sesión (bug)

- **Archivo:** `apps/api/src/modules/auth/auth.service.ts`, función `refresh`.
- **Problema:** el navegador comparte la cookie entre pestañas. Si dos pestañas piden `/auth/refresh` casi a la vez, la segunda llega con un token ya rotado y el servidor revoca **todos** los tokens del usuario, incluido el recién emitido. Reproducido: dos refresh en paralelo responden `200` y `401`, y la sesión se pierde.
- **Corrección:** margen de gracia. Si el token se revocó hace menos de `REFRESH_REUSE_GRACE_MS = 10_000`, responder `401` **sin** revocar los demás. Solo fuera de ese margen se trata como robo.
- **Prueba:** dos refresh en paralelo con la misma cookie → uno `200`. Después, el token nuevo de esa respuesta sigue sirviendo para otro refresh. Mantener la prueba existente de reuso fuera del margen (ajustando el tiempo con `vi.useFakeTimers` o manipulando `revokedAt`).

### A2. Registro simultáneo devuelve 500 (bug)

- **Archivo:** `auth.service.ts`, función `register`.
- **Problema:** primero busca el correo y luego crea el usuario. Dos registros iguales a la vez chocan con el índice único y la API responde `500`. Reproducido: `201`, `500`, `500`.
- **Corrección:** quitar el `findUnique` previo y envolver el `create` en `try/catch` con `isUniqueConstraintError` (igual que en `categories.service.ts`), lanzando `CONFLICT`.
- **Prueba:** tres registros en paralelo con el mismo correo → exactamente un `201` y el resto `409`.

### A3. La tabla `RefreshToken` crece sin límite (limpieza)

- **Archivo:** `auth.service.ts`, función `issueRefreshToken`.
- **Corrección:** antes de crear el token nuevo, borrar los vencidos del usuario: `deleteMany({ where: { userId, expiresAt: { lt: new Date() } } })`.
- **Prueba:** un usuario con un token vencido en BD → tras login, ese token ya no existe.

### A4. Rate limit detrás de un proxy (bug al desplegar)

- **Archivos:** `apps/api/src/config/env.ts`, `apps/api/src/app.ts`.
- **Problema:** detrás de Caddy todas las peticiones llegan con la IP del proxy. Los 4 usuarios compartirían un solo límite de 20 intentos de login, y `express-rate-limit` avisa del header `X-Forwarded-For` mal configurado.
- **Corrección:** nueva variable `TRUST_PROXY` (número de saltos, por defecto `0`), validada con Zod, y `app.set('trust proxy', env.TRUST_PROXY)` en `createApp`. En producción vale `1` (solo Caddy delante).
- **Prueba:** con `TRUST_PROXY=1`, `req.ip` toma el valor de `X-Forwarded-For`.

### A5. Variables de entorno sin archivo `.env` (necesario para Docker)

- **Problema:** en el contenedor las variables llegan por Docker, no por un `.env`:
  - `apps/api/package.json` → `start` usa `--env-file=../../.env`, que falla si el archivo no existe.
  - `apps/api/prisma.config.ts` → si no hay `.env` intenta cargar `.env.example`, que tampoco existe en la imagen.
- **Corrección:**
  - en `start`, usar `--env-file-if-exists=../../.env` (Node ≥ 22.9);
  - en `prisma.config.ts`, cargar `.env` **solo si existe** y no caer en `.env.example` cuando `NODE_ENV=production`.
- **Prueba:** `NODE_ENV=production DATABASE_URL=... node dist/server.js` arranca sin ningún `.env` presente.

### A6. Frontend con URL relativa

- El build de producción debe usar `VITE_API_URL=/api` (mismo dominio). No hace falta cambiar el código del cliente HTTP, solo documentarlo y usarlo en el Dockerfile del frontend.
- `CORS_ORIGIN` sigue siendo obligatorio: en producción vale `https://<dominio>`.

### A7. Health check que verifica la base

- **Archivo:** `apps/api/src/modules/health/health.routes.ts`.
- Hacer `SELECT 1` con Prisma: responder `200 { status: 'ok' }` si funciona, o `503 { status: 'error' }` si no. Docker Compose lo usa como healthcheck.
- **Prueba:** el caso feliz responde `200`. El caso de error se prueba con un mock del cliente Prisma.

Registrá A1–A7 en `docs/decisiones.md` (una línea cada uno).

## 3. Fase B — Archivos de despliegue

Crear estos archivos. Comentarios solo donde expliquen un **por qué**.

```
deploy/
├── Dockerfile.api           # build multi-etapa de la API
├── Dockerfile.web           # build de Vite + imagen de Caddy con los estáticos
├── Caddyfile
├── docker-compose.prod.yml
├── .env.prod.example
└── backup.sh
docs/
└── DESPLIEGUE.md            # manual paso a paso para el humano (sección 4)
```

### B1. `deploy/Dockerfile.api`

- Base `node:22-bookworm-slim`, **no** Alpine: `bcrypt` es nativo y en musl da problemas de compilación.
- Etapa `build`:
  - `npm ci` del monorepo, lo que corre `prisma generate` por `postinstall`;
  - `npm run build -w @gestor-gastos/api`.
- Etapa `runtime`:
  - solo `node_modules` de producción, `dist/`, `prisma/`, `prisma.config.ts` y el cliente generado (`src/generated` o donde quede tras el build);
  - usuario no root (`node`);
  - `NODE_ENV=production`;
  - `CMD ["node", "dist/server.js"]`.
- Las imágenes se construyen **en la VM**, que es Arm64. No compilar en x86 para luego copiar.

### B2. Migraciones

- Servicio `migrate` en el compose, de un solo uso: corre `npx prisma migrate deploy` con la etapa `build` (que tiene el CLI de Prisma) y termina.
- `api` arranca con `depends_on: migrate: condition: service_completed_successfully`.
- **No** correr el seed en producción: crea un usuario demo.

### B3. `deploy/Dockerfile.web`

- Etapa `build`: `node:22-bookworm-slim`, `npm ci`, `VITE_API_URL=/api npm run build -w @gestor-gastos/web`.
- Etapa final: `caddy:2`, que copia `apps/web/dist` a `/srv` y el `Caddyfile`.

### B4. `deploy/Caddyfile`

```caddy
{$DOMAIN} {
	encode zstd gzip

	handle /api/* {
		reverse_proxy api:3000
	}

	handle {
		root * /srv
		try_files {path} /index.html
		file_server
	}

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
}
```

`try_files … /index.html` hace que React Router funcione al recargar cualquier ruta.

### B5. `deploy/docker-compose.prod.yml`

- **Servicios:**
  - `db`: `postgres:16`, volumen `db-data`, **sin** `ports`, healthcheck `pg_isready`;
  - `migrate`: ver B2;
  - `api`: healthcheck contra `/api/health`;
  - `web`: la imagen de B3, puertos `80:80` y `443:443` (y `443:443/udp` para HTTP/3), volúmenes `caddy-data` y `caddy-config`, para que el certificado no se pida de nuevo en cada reinicio.
- `restart: unless-stopped` en `db`, `api` y `web`.
- Logs con rotación en todos los servicios: `logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }`. El disco es de 50 GB.
- Variables desde `deploy/.env` (no versionado), con `env_file` o interpolación `${VAR}`.

### B6. `deploy/.env.prod.example`

```dotenv
DOMAIN=gastos-ejemplo.duckdns.org
POSTGRES_USER=gastos
POSTGRES_PASSWORD=cambia-esto
POSTGRES_DB=gastos
DATABASE_URL=postgresql://gastos:cambia-esto@db:5432/gastos
NODE_ENV=production
PORT=3000
TRUST_PROXY=1
CORS_ORIGIN=https://gastos-ejemplo.duckdns.org
JWT_ACCESS_SECRET=genera-con-openssl-rand-base64-48
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
```

Agregar `deploy/.env` al `.gitignore` (ya cubierto por `.env.*`, verificalo).

### B7. `deploy/backup.sh`

- `docker compose ... exec -T db pg_dump -U $POSTGRES_USER -Fc $POSTGRES_DB` a `~/backups/gastos-YYYY-MM-DD.dump`.
- Borra los respaldos de más de 14 días.
- `set -euo pipefail`. Sale con error si el dump queda vacío.
- Pensado para cron diario: `0 3 * * * /home/ubuntu/gestor-gastos/deploy/backup.sh`.
- En `DESPLIEGUE.md`, documentar la restauración con `pg_restore`.

### B8. README

Agregar la sección **Despliegue**, que enlace a `docs/DESPLIEGUE.md`, y la variable `TRUST_PROXY` a la tabla de variables.

**Criterio de aceptación de la fase B:** en una máquina local con Docker, `docker compose -f deploy/docker-compose.prod.yml up -d --build` con `DOMAIN=localhost` levanta todo. `https://localhost` muestra el login (Caddy usa un certificado interno para localhost). Registrar, crear una transacción, recargar la página y ver el reporte funcionan.

## 4. Fase C — `docs/DESPLIEGUE.md` (manual para el humano)

Escribilo en español, con pasos numerados y comandos copiables. Quien lo sigue sabe usar la terminal, pero nunca administró un servidor. Debe cubrir:

1. **Cuenta de Oracle Cloud.**
   - Pide tarjeta, solo para verificar identidad.
   - La **región de origen no se puede cambiar** y los recursos gratis solo existen ahí: elegir la más cercana a Costa Rica.
2. **Política de VM inactiva (importante).** Oracle puede reclamar una instancia Always Free si durante 7 días tiene a la vez menos del 20 % de CPU (percentil 95), de red y de memoria (la memoria cuenta en las A1). Con 4 usuarios esta app estaría por debajo en las tres. Documentar las dos salidas:
   - **Recomendada:** pasar la cuenta a _Pay As You Go_. Los recursos Always Free siguen sin costo y no se reclaman por inactividad. Crear en el mismo momento un **presupuesto con alerta a $1** para enterarse de cualquier cobro.
   - **Sin tarjeta activa:** crear una VM más chica (1 OCPU, 3 GB) para que el uso real de memoria pase del 20 %, y revisarlo en las métricas de la consola. **No** usar scripts que generan carga falsa.
3. **Crear la VM.**
   - Shape `VM.Standard.A1.Flex`, imagen Ubuntu 24.04 (aarch64), IP pública, clave SSH propia.
   - Si sale "Out of capacity", probar otro dominio de disponibilidad o reintentar más tarde.
4. **Abrir puertos 80 y 443**, en los dos lugares, porque es donde más gente se traba:
   - _Security List_ de la VCN: reglas de entrada TCP 80 y 443 desde `0.0.0.0/0`;
   - firewall de la VM: las imágenes Ubuntu de Oracle traen reglas `iptables` que bloquean todo. Insertar las reglas **antes** del `REJECT` y guardar con `netfilter-persistent save`.
5. **Preparar el servidor:**
   - actualizar paquetes;
   - activar `unattended-upgrades`;
   - instalar Docker Engine + plugin Compose (repositorio oficial de Docker);
   - agregar al usuario al grupo `docker`;
   - 2 GB de swap, para que no falle el build de Vite.
6. **Dominio en DuckDNS:** crear el subdominio y apuntarlo a la IP pública de la VM. Comprobar con `nslookup`.
7. **Primer despliegue:**
   - `git clone` del repo;
   - `cp deploy/.env.prod.example deploy/.env` y editarlo;
   - generar el secreto con `openssl rand -base64 48`;
   - `docker compose -f deploy/docker-compose.prod.yml up -d --build`.
8. **Verificar:**
   - `docker compose ps` (todo `healthy`);
   - `curl https://<dominio>/api/health`;
   - abrir la web, registrarse y crear una transacción.
9. **Respaldos:** dar permisos a `backup.sh`, agregarlo al cron, probar una restauración. Recomendar copiar de vez en cuando un respaldo fuera de la VM (por ejemplo, `scp` a la PC).
10. **Actualizar la app:** `git pull && docker compose -f deploy/docker-compose.prod.yml up -d --build`, y limpiar imágenes viejas con `docker image prune -f`.
11. **Problemas comunes:**
    - no carga la web → puertos o DNS;
    - Caddy no obtiene el certificado → el puerto 80 está cerrado o el DNS no apunta a la VM;
    - `api` reinicia una y otra vez → `docker compose logs api` (casi siempre una variable de entorno inválida);
    - la sesión se pierde al recargar → se está entrando por IP y no por el dominio.

## 5. Reglas para el agente

1. Primero la fase A completa y en verde, después B y por último C.
2. No agregues servicios, herramientas ni dependencias fuera de esta guía sin proponerlo antes.
3. No subas secretos. Los ejemplos usan valores ficticios.
4. Si no podés probar algo (por ejemplo, la VM real), decilo explícitamente en el resumen de la fase.
5. Al terminar cada fase, resumí en 3–5 líneas qué se hizo, qué probaste y qué falta.
