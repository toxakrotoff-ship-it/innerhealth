#!/usr/bin/env bash
# Deploy Inner Health on VPS: build and start containers.
# Usage: from repo root (nextjs-project): ./deploy/deploy.sh

set -euo pipefail
cd "$(dirname "$0")/.."

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

MIN_FREE_MB="${MIN_FREE_MB:-4096}"
POST_BUILD_MIN_FREE_MB="${POST_BUILD_MIN_FREE_MB:-2048}"
NO_CACHE="${NO_CACHE:-0}"
SKIP_VPS_SAFEGUARDS="${SKIP_VPS_SAFEGUARDS:-0}"

# Идемпотентно обеспечивает наличие фоновых секретов в .env (генерирует
# отсутствующие YOOKASSA_POLL_TOKEN / INFRA_ALERT_TOKEN). Существующие значения
# не трогает, безопасно вызывать на каждом деплое.
ensure_app_secrets() {
  if [ -x "./deploy/ops/setup-secrets.sh" ]; then
    log "Ensuring app .env secrets (idempotent)..."
    ./deploy/ops/setup-secrets.sh
  else
    log "WARN: deploy/ops/setup-secrets.sh missing or not executable; skipping secrets bootstrap."
  fi
}

# Ставит/обновляет VPS-крон для docker-maintenance, vps-monitor и yookassa-poll.
# Best-effort: если sudo не настроен или crontab недоступен, только пишем
# предупреждение и не валим деплой.
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
      log "WARN: sudo requires password and stdin не интерактивный; пропускаю установку cron."
      log "      Запустите вручную: sudo -E ./deploy/ops/install-vps-safeguards.sh --non-interactive"
    fi
  fi
}

log "Pulling latest code..."
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

ensure_app_secrets

cleanup_docker_cache_if_needed "${MIN_FREE_MB}"
require_free_disk_mb "${MIN_FREE_MB}"

# Optional: issue/renew TLS certificate and copy it into deploy/nginx/ssl.
# Usage example (before running this script):
#   export CERT_DOMAINS="innerhealth.ru sprintpower.inetrnet.pp.ru"
#   export CERT_EMAIL=you@example.com
# Backward compatibility: CERT_DOMAIN is still supported for a single domain.
DOMAINS_INPUT="${CERT_DOMAINS:-${CERT_DOMAIN:-}}"
if [ -n "${DOMAINS_INPUT}" ] && [ -n "${CERT_EMAIL:-}" ]; then
  DOMAINS_NORMALIZED="$(echo "${DOMAINS_INPUT}" | tr ',' ' ')"
  FIRST_DOMAIN="$(echo "${DOMAINS_NORMALIZED}" | awk '{print $1}')"
  CERTBOT_DOMAIN_ARGS=""
  for d in ${DOMAINS_NORMALIZED}; do
    CERTBOT_DOMAIN_ARGS="${CERTBOT_DOMAIN_ARGS} -d ${d}"
  done

  log "Issuing/renewing TLS certificate for: ${DOMAINS_NORMALIZED}"
  if command -v certbot >/dev/null 2>&1; then
    # Standalone mode: certbot binds to :80, so stop our nginx container first.
    log "Stopping nginx container (free :80 for certbot)..."
    docker_compose stop nginx || true

    # shellcheck disable=SC2086
    sudo certbot certonly --standalone --non-interactive --agree-tos \
      ${CERTBOT_DOMAIN_ARGS} -m "${CERT_EMAIL}" || echo "WARN: certbot failed, continuing without updating certificate."

    LIVE_DIR="$(sudo sh -c "ls -d /etc/letsencrypt/live/${FIRST_DOMAIN}* 2>/dev/null | head -n 1" || true)"
    if [ -n "${LIVE_DIR}" ] && [ -d "${LIVE_DIR}" ]; then
      log "Copying certificate to deploy/nginx/ssl/ ..."
      mkdir -p deploy/nginx/ssl
      sudo cp "${LIVE_DIR}/fullchain.pem" "deploy/nginx/ssl/fullchain.pem"
      sudo cp "${LIVE_DIR}/privkey.pem" "deploy/nginx/ssl/privkey.pem"
      sudo chmod 600 deploy/nginx/ssl/privkey.pem || true
    else
      echo "WARN: /etc/letsencrypt/live/${FIRST_DOMAIN}* not found; certificate was not copied."
    fi
  else
    echo "WARN: certbot not installed; skip certificate issuance. Install certbot or unset CERT_DOMAINS/CERT_EMAIL."
  fi
fi

log "Building and starting containers..."
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
docker_compose up -d db

log "Waiting for database to be healthy..."
sleep 5

log "Applying migrations (one-off container)..."
docker_compose run --rm migrator

log "Starting app and remaining services..."
docker_compose up -d

log "Reloading nginx with current config..."
docker_compose up -d --force-recreate nginx

cleanup_docker_cache_if_needed "${POST_BUILD_MIN_FREE_MB}"

log "Waiting for app to be up..."
sleep 5
docker_compose ps

ensure_vps_safeguards

log "Done. App: http://$(hostname -I 2>/dev/null | awk '{print $1}'):80 (or your domain)"
log "Set RUN_MIGRATE=1 in .env if you want migrations to run on every container start (optional)."
