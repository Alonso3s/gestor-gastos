#!/usr/bin/env bash
# Respaldo de la base de producción. Pensado para cron diario:
#   0 3 * * * /home/ubuntu/gestor-gastos/deploy/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
RETENTION_DAYS=14

set -a
# shellcheck source=/dev/null
source "$DEPLOY_DIR/.env"
set +a

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/gastos-$(date +%F).dump"
tmp="$file.tmp"
trap 'rm -f "$tmp"' EXIT

docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" exec -T db \
  pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$tmp"

if [[ ! -s "$tmp" ]]; then
  echo "$(date -Is) El respaldo quedó vacío" >&2
  exit 1
fi

mv "$tmp" "$file"
find "$BACKUP_DIR" -name 'gastos-*.dump' -mtime +"$RETENTION_DAYS" -delete
echo "$(date -Is) Respaldo listo: $file"
