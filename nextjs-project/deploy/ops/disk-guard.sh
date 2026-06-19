#!/usr/bin/env bash
# Shared disk checks for deploy scripts.
# shellcheck shell=bash

docker_disk_free_mb() {
  df -Pm / | awk 'NR==2 { print $4 }'
}

docker_disk_used_percent() {
  df -P / | awk 'NR==2 { gsub("%", "", $5); print $5 }'
}

run_safe_docker_cleanup() {
  docker image prune -f || true
  docker container prune -f || true
  docker network prune -f || true
  docker builder prune -af --filter "until=${DOCKER_CACHE_MAX_AGE:-168h}" || true
}

run_aggressive_docker_cleanup() {
  docker image prune -af || true
  docker container prune -f || true
  docker network prune -f || true
  docker builder prune -af || true
  if docker buildx version >/dev/null 2>&1; then
    docker buildx prune -af || true
  fi
}

cleanup_docker_cache_if_needed() {
  local target_free_mb="${1:-${TARGET_FREE_MB:-6144}}"
  local free_mb
  free_mb="$(docker_disk_free_mb)"

  if [ -n "${free_mb}" ] && [ "${free_mb}" -ge "${target_free_mb}" ]; then
    log "Disk OK (free ${free_mb}MB, target >= ${target_free_mb}MB), skipping Docker cache cleanup."
    return 0
  fi

  log "Low disk (${free_mb:-0}MB free, target ${target_free_mb}MB). Running safe Docker cleanup..."
  run_safe_docker_cleanup

  free_mb="$(docker_disk_free_mb)"
  if [ -n "${free_mb}" ] && [ "${free_mb}" -ge "${target_free_mb}" ]; then
    log "Disk recovered to ${free_mb}MB after safe cleanup."
    return 0
  fi

  log "Still ${free_mb:-0}MB free after safe cleanup (target ${target_free_mb}MB). Running aggressive Docker cleanup..."
  run_aggressive_docker_cleanup

  free_mb="$(docker_disk_free_mb)"
  if [ -n "${free_mb}" ] && [ "${free_mb}" -ge "${target_free_mb}" ]; then
    log "Disk recovered to ${free_mb}MB after aggressive cleanup."
    return 0
  fi

  log "WARN: ${free_mb:-0}MB free after cleanup (target ${target_free_mb}MB). Nothing left to prune or disk is used outside Docker."
}

require_free_disk_mb() {
  local absolute_min_mb="${1}"
  local target_free_mb="${2:-${TARGET_FREE_MB:-6144}}"
  local free_mb
  free_mb="$(docker_disk_free_mb)"
  if [ -z "${free_mb}" ] || [ "${free_mb}" -lt "${absolute_min_mb}" ]; then
    log "ERROR: only ${free_mb:-0}MB free on /, need at least ${absolute_min_mb}MB for Docker build."
    log "Target is ${target_free_mb}MB. Run ./deploy/ops/prune-docker-build-cache.sh or expand VPS disk."
    exit 1
  fi
  if [ "${free_mb}" -lt "${target_free_mb}" ]; then
    log "WARN: free disk ${free_mb}MB is below target ${target_free_mb}MB, but enough to continue (min ${absolute_min_mb}MB)."
  else
    log "Free disk on /: ${free_mb}MB ($(docker_disk_used_percent || echo 0)% used)"
  fi
}
