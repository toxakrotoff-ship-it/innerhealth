#!/usr/bin/env bash
set -euo pipefail

# Safe Docker cleanup (disk pressure prevention).
# - Removes unused images, build cache, and networks.
# - Does NOT remove volumes (to avoid deleting Postgres data).
# - Keeps recent cache so repeated deploys stay fast.

log() {
  if command -v logger >/dev/null 2>&1; then
    logger -t innerhealth-ops -- "$*"
  fi
  echo "[$(date -Is)] $*"
}

log "docker-maintenance: start"

if ! command -v docker >/dev/null 2>&1; then
  log "docker-maintenance: docker not found, skip"
  exit 0
fi

CACHE_MAX_AGE="${DOCKER_CACHE_MAX_AGE:-240h}"

docker image prune -af --filter "until=${CACHE_MAX_AGE}"
docker container prune -f
docker network prune -f
docker builder prune -af --filter "until=${CACHE_MAX_AGE}"

log "docker-maintenance: done"
