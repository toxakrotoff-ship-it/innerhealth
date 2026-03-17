#!/usr/bin/env bash
set -euo pipefail

# Safe Docker cleanup (disk pressure prevention).
# - Removes unused images, build cache, and networks.
# - Does NOT remove volumes (to avoid deleting Postgres data).

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

# Prune unused containers/images/networks/build cache (no volumes).
docker system prune -af

log "docker-maintenance: done"

