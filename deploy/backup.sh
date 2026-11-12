#!/usr/bin/env bash
# Respaldo diario de la base de datos. Pensado para cron:
#   0 3 * * * /home/ubuntu/gestor-gastos/deploy/backup.sh
set -euo pipefail

RETENTION_DAYS=14
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_FILE="$BACKUP_DIR/gastos-$(date +%F).dump"
PARTIAL_FILE="$BACKUP_FILE.partial"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$PARTIAL_FILE"' EXIT

# Usuario y base se leen dentro del contenedor, que ya los tiene en su entorno:
# así no hay que interpretar `deploy/.env` desde este script.
docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$PARTIAL_FILE"

if [ ! -s "$PARTIAL_FILE" ]; then
  echo "Error: el respaldo quedó vacío" >&2
  exit 1
fi

# Se renombra recién al final para no dejar con nombre definitivo un respaldo a medias.
mv "$PARTIAL_FILE" "$BACKUP_FILE"
find "$BACKUP_DIR" -name 'gastos-*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "Respaldo creado: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
