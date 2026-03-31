#!/usr/bin/env bash
# Быстрое обновление приложения и бота без полной пересборки DB (nginx пересоздаём для актуального host-конфига).
# Использование: из каталога nextjs-project: ./deploy/deploy-quick.sh

set -euo pipefail

log() {
  echo "[$(date -Is)] $*"
}

docker_disk_free_mb() {
  df -Pm / | awk 'NR==2 { print $4 }'
}

cleanup_docker_cache() {
  log "Cleaning up Docker cache..."
  docker image prune -f || true
  docker builder prune -af || true
  docker container prune -f || true
  docker network prune -f || true
}

require_free_disk_mb() {
  local min_free_mb="${1}"
  local free_mb
  free_mb="$(docker_disk_free_mb)"
  if [ -z "${free_mb}" ] || [ "${free_mb}" -lt "${min_free_mb}" ]; then
    log "ERROR: only ${free_mb:-0}MB free on /, need at least ${min_free_mb}MB for Docker build."
    log "Run docker cleanup or expand VPS disk before retrying deploy."
    exit 1
  fi
  log "Free disk on /: ${free_mb}MB"
}

MIN_FREE_MB="${MIN_FREE_MB:-3072}"
# Каталог с docker-compose (nextjs-project) — сюда вернёмся для сборки
DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"
# Репозиторий может быть на уровень выше (innerhealth)
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$GIT_ROOT"

log "Pulling latest from repo (code + prisma/migrations)..."
git fetch --prune origin
CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "${CURRENT_BRANCH}" ]; then
  echo "ERROR: Unable to detect current git branch."
  exit 1
fi
if ! git merge-base --is-ancestor "HEAD" "origin/${CURRENT_BRANCH}"; then
  echo "ERROR: Local branch has commits not in origin/${CURRENT_BRANCH}. Resolve manually before deploy."
  exit 1
fi
git pull --ff-only origin "${CURRENT_BRANCH}"

cd "$DEPLOY_DIR"

cleanup_docker_cache
require_free_disk_mb "${MIN_FREE_MB}"

log "Building app image (with cache)..."
docker compose build app

log "Building bot image (with cache)..."
docker compose build telegram-bot

log "Migration status (before deploy)..."
docker compose run --rm app npx prisma migrate status || true

log "Applying migrations from repo..."
docker compose run --rm app npx prisma migrate deploy

log "Restarting app..."
docker compose up -d --force-recreate app

log "Restarting telegram-bot (no separate build)..."
# Telegram-боты используют отдельный bot image.
docker compose up -d --force-recreate --no-build telegram-bot telegram-bot-sprint

log "Restarting max-bot (no separate build)..."
docker compose up -d --force-recreate --no-build max-bot max-bot-sprint

log "Recreating nginx (pick up new host/domain config)..."
docker compose up -d --force-recreate nginx

log "Removing old telegram-bot image (if still present)..."
docker image rm nextjs-project-telegram-bot:latest || true

cleanup_docker_cache

log "Done."
docker compose ps
