#!/usr/bin/env bash
set -euo pipefail

# Daily Docker cleanup and verified database backups. Shares a lock with deploys.
# Keeps two rollback images per service and two verified database dumps.
# Usage: docker-maintenance.sh [--dry-run]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="${DOCKER_OPS_LOCK_FILE:-/opt/innerhealth/.docker-ops.lock}"
ARGS=()
case "${1:-}" in
  "") ;;
  --dry-run) ARGS+=(--dry-run) ;;
  *) echo "Usage: $0 [--dry-run]" >&2; exit 2 ;;
esac

log() {
  echo "[$(date -Is)] $*"
}

# Include helper failures in the existing ops journal as well as stdout.
exec > >(tee >(logger -t innerhealth-ops)) 2>&1
trap 'log "docker-maintenance: ERROR at line $LINENO"' ERR

if [ ! -e "$LOCK_FILE" ]; then
  (umask 022; touch "$LOCK_FILE")
fi
exec 9< "$LOCK_FILE"
if ! flock -n 9; then
  log "docker-maintenance: deploy/maintenance in progress; skipping"
  exit 0
fi

log "docker-maintenance: start ${ARGS[*]:-}"

if ! command -v docker >/dev/null 2>&1; then
  log "docker-maintenance: ERROR: docker not found"
  exit 1
fi

python3 "${SCRIPT_DIR}/docker-retention.py" images "${ARGS[@]}"
if [ "${1:-}" = "--dry-run" ]; then
  log "WOULD prune dangling images older than 24h and all unused Docker build cache"
else
  # Saved rollbacks are tagged; only discard old, untagged build artifacts here.
  docker image prune -f --filter until=24h
  docker builder prune -af
fi
python3 "${SCRIPT_DIR}/docker-retention.py" backups "${ARGS[@]}"

log "docker-maintenance: done"
