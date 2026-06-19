#!/usr/bin/env bash
# Shared disk checks for deploy scripts.
# shellcheck shell=bash

docker_disk_free_mb() {
  df -Pm / | awk 'NR==2 { print $4 }'
}

docker_disk_used_percent() {
  df -P / | awk 'NR==2 { gsub("%", "", $5); print $5 }'
}

cleanup_docker_cache_if_needed() {
  local min_free_mb="${1:-${TARGET_FREE_MB:-6144}}"
  local free_mb
  free_mb="$(docker_disk_free_mb)"

  if [ -n "${free_mb}" ] && [ "${free_mb}" -ge "${min_free_mb}" ]; then
    log "Disk OK (free ${free_mb}MB, target >= ${min_free_mb}MB), skipping Docker cache cleanup."
    return 0
  fi

  log "Low disk (${free_mb:-0}MB free, target ${min_free_mb}MB). Running safe Docker cleanup..."
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
  log "Free disk on /: ${free_mb}MB ($(docker_disk_used_percent || echo 0)% used)"
}
