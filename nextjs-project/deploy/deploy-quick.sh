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

# shellcheck source=ops/disk-guard.sh
source "$(dirname "$0")/ops/disk-guard.sh"

# Очистка кэша и проверка перед сборкой: держим >= 6 ГБ свободного места на /.
MIN_FREE_MB="${MIN_FREE_MB:-6144}"
POST_BUILD_MIN_FREE_MB="${POST_BUILD_MIN_FREE_MB:-6144}"
NO_CACHE="${NO_CACHE:-0}"
SKIP_VPS_SAFEGUARDS="${SKIP_VPS_SAFEGUARDS:-0}"

# Идемпотентно обеспечивает наличие фоновых секретов в .env.
# См. deploy/ops/setup-secrets.sh.
ensure_app_secrets() {
  if [ -x "./deploy/ops/setup-secrets.sh" ]; then
    log "Ensuring app .env secrets (idempotent)..."
    ./deploy/ops/setup-secrets.sh
  else
    log "WARN: deploy/ops/setup-secrets.sh missing or not executable; skipping secrets bootstrap."
  fi
}

# Ставит/обновляет VPS-крон. Best-effort: при отсутствии sudo/crontab
# просто пишем предупреждение и не валим деплой.
ensure_vps_safeguards() {
  if [ "${SKIP_VPS_SAFEGUARDS}" = "1" ]; then
    log "SKIP_VPS_SAFEGUARDS=1, пропускаю установку cron'а."
    return 0
  fi
  if [ ! -x "./deploy/ops/install-vps-safeguards.sh" ]; then
    log "WARN: deploy/ops/install-vps-safeguards.sh missing or not executable; skipping cron setup."
    return 0
  fi
  if ! command -v crontab >/dev/null 2>&1; then
    log "WARN: crontab not available on host; skipping cron setup."
    return 0
  fi
  log "Refreshing VPS safeguards (cron + ops scripts)..."
  if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    ./deploy/ops/install-vps-safeguards.sh --non-interactive || \
      log "WARN: install-vps-safeguards.sh failed; cron not refreshed."
  else
    if sudo -n true 2>/dev/null; then
      sudo -E ./deploy/ops/install-vps-safeguards.sh --non-interactive || \
        log "WARN: install-vps-safeguards.sh failed; cron not refreshed."
    else
      log "WARN: sudo требует пароль и стандартный ввод не интерактивный; пропускаю установку cron."
      log "      Запустите вручную: sudo -E ./deploy/ops/install-vps-safeguards.sh --non-interactive"
    fi
  fi
}

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

ensure_app_secrets

cleanup_docker_cache_if_needed "${MIN_FREE_MB}"
require_free_disk_mb "${MIN_FREE_MB}"

BUILD_ARGS=()
if [ "${NO_CACHE}" = "1" ]; then
  BUILD_ARGS+=(--no-cache)
fi

log "Building app image..."
docker_compose build "${BUILD_ARGS[@]}" app

log "Building migrator image..."
docker_compose build "${BUILD_ARGS[@]}" migrator

log "Building bot image..."
docker_compose build "${BUILD_ARGS[@]}" telegram-bot

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

ensure_vps_safeguards

log "Done."
docker_compose ps
