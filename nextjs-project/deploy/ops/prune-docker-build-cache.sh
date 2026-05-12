#!/usr/bin/env bash
set -euo pipefail

# Удаляет весь кэш сборки Docker (BuildKit / buildx).
# Не трогает: запущенные контейнеры, используемые образы, volumes (в т.ч. Postgres).
# Следствие: следующие `docker compose build` будут дольше, пока кэш не нарастет снова.
#
# Запуск на VPS из каталога nextjs-project:
#   chmod +x deploy/ops/prune-docker-build-cache.sh
#   ./deploy/ops/prune-docker-build-cache.sh

log() {
  if command -v logger >/dev/null 2>&1; then
    logger -t innerhealth-ops -- "$*"
  fi
  echo "[$(date -Is)] $*"
}

if ! command -v docker >/dev/null 2>&1; then
  log "docker not found, exit"
  exit 1
fi

log "prune-docker-build-cache: disk usage (docker)"
docker system df 2>/dev/null || true

log "prune-docker-build-cache: docker builder prune -af (all BuildKit cache)"
docker builder prune -af

if docker buildx version >/dev/null 2>&1; then
  log "prune-docker-build-cache: docker buildx prune -af"
  docker buildx prune -af || log "WARN: buildx prune failed (ignored)"
fi

log "prune-docker-build-cache: disk usage after"
docker system df 2>/dev/null || true
log "prune-docker-build-cache: done"
