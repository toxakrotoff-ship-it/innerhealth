#!/usr/bin/env bash
# Быстрое обновление приложения и бота без полной пересборки DB (nginx пересоздаём для актуального host-конфига).
# Использование: из каталога nextjs-project: ./deploy/deploy-quick.sh

set -euo pipefail

log() {
  echo "[$(date -Is)] $*"
}

docker_compose() {
  DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}" COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}" docker compose "$@"
}

docker_disk_free_mb() {
  df -Pm / | awk 'NR==2 { print $4 }'
}

cleanup_docker_cache_if_needed() {
  local min_free_mb="${1}"
  local free_mb
  free_mb="$(docker_disk_free_mb)"
  if [ -n "${free_mb}" ] && [ "${free_mb}" -ge "${min_free_mb}" ]; then
    log "Free disk is healthy (${free_mb}MB), skipping Docker cache cleanup."
    return 0
  fi

  log "Low disk (${free_mb:-0}MB). Running safe Docker cleanup..."
  docker image prune -f || true
  docker container prune -f || true
  docker network prune -f || true
  docker builder prune -af --filter "until=${DOCKER_CACHE_MAX_AGE:-168h}" || true
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
POST_BUILD_MIN_FREE_MB="${POST_BUILD_MIN_FREE_MB:-1536}"
NO_CACHE="${NO_CACHE:-0}"
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

cleanup_docker_cache_if_needed "${MIN_FREE_MB}"
require_free_disk_mb "${MIN_FREE_MB}"

BUILD_ARGS=()
if [ "${NO_CACHE}" = "1" ]; then
  BUILD_ARGS+=(--no-cache)
fi

log "Building app, migrator and bot images..."
docker_compose build "${BUILD_ARGS[@]}" app migrator telegram-bot

log "Migration status (before deploy)..."
docker_compose run --rm migrator npx prisma migrate status || true

log "Applying migrations from repo..."
docker_compose run --rm migrator

log "Restarting app..."
docker_compose up -d --force-recreate app

log "Restarting telegram-bot (no separate build)..."
# Telegram-боты используют отдельный bot image.
docker_compose up -d --force-recreate --no-build telegram-bot telegram-bot-sprint

log "Restarting max-bot (no separate build)..."
docker_compose up -d --force-recreate --no-build max-bot max-bot-sprint

log "Recreating nginx (pick up new host/domain config)..."
docker_compose up -d --force-recreate nginx

log "Removing old telegram-bot image (if still present)..."
docker image rm nextjs-project-telegram-bot:latest || true

cleanup_docker_cache_if_needed "${POST_BUILD_MIN_FREE_MB}"

log "Done."
docker_compose ps
