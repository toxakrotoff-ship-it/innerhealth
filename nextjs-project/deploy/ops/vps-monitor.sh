#!/usr/bin/env bash
set -euo pipefail

# Lightweight VPS monitor that sends infra alerts to Inner Health via API.
#
# Required env:
# - SITE_URL: e.g. https://innerhealth.example.com
# - INFRA_ALERT_TOKEN: token for /api/admin/infra-alert (header x-infra-alert-token)
#
# Optional env (defaults):
# - DISK_WARN=80
# - DISK_CRIT=90
# - MEM_WARN=80
# - MEM_CRIT=90
# - DEDUPE_SECONDS=1800

SITE_URL="${SITE_URL:-}"
INFRA_ALERT_TOKEN="${INFRA_ALERT_TOKEN:-}"

DISK_WARN="${DISK_WARN:-80}"
DISK_CRIT="${DISK_CRIT:-90}"
MEM_WARN="${MEM_WARN:-80}"
MEM_CRIT="${MEM_CRIT:-90}"
DEDUPE_SECONDS="${DEDUPE_SECONDS:-1800}"

STATE_FILE="${STATE_FILE:-/var/tmp/innerhealth-infra-alerts.state}"

now_epoch() { date +%s; }

log() {
  if command -v logger >/dev/null 2>&1; then
    logger -t innerhealth-ops -- "$*"
  fi
  echo "[$(date -Is)] $*"
}

require_env() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    log "vps-monitor: missing env $name"
    exit 1
  fi
}

require_env "SITE_URL" "$SITE_URL"
require_env "INFRA_ALERT_TOKEN" "$INFRA_ALERT_TOKEN"

touch "$STATE_FILE" 2>/dev/null || true

should_send() {
  local key="$1"
  local now
  now="$(now_epoch)"
  local last="0"
  if [ -f "$STATE_FILE" ]; then
    last="$(grep -E "^${key}=" "$STATE_FILE" 2>/dev/null | tail -n 1 | cut -d= -f2 || echo 0)"
  fi
  if [ -z "$last" ]; then last="0"; fi
  local delta=$(( now - last ))
  [ "$delta" -ge "$DEDUPE_SECONDS" ]
}

mark_sent() {
  local key="$1"
  local now
  now="$(now_epoch)"
  echo "${key}=${now}" >> "$STATE_FILE"
}

send_alert() {
  local kind="$1"
  local severity="$2"
  local message="$3"

  local key="${kind}_${severity}"
  if ! should_send "$key"; then
    log "vps-monitor: dedupe active for ${key}, skip"
    return 0
  fi

  local url="${SITE_URL%/}/api/admin/infra-alert"
  curl -fsS -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "x-infra-alert-token: ${INFRA_ALERT_TOKEN}" \
    -d "{\"kind\":\"${kind}\",\"severity\":\"${severity}\",\"message\":\"${message//\"/\\\"}\"}" >/dev/null

  mark_sent "$key"
  log "vps-monitor: sent ${key}"
}

disk_used_percent() {
  df -P / | awk 'NR==2 { gsub("%","",$5); print $5 }'
}

mem_used_percent() {
  # Uses "free" if available, otherwise returns 0
  if ! command -v free >/dev/null 2>&1; then
    echo 0
    return 0
  fi
  # total/used in MiB
  free -m | awk 'NR==2 { if ($2==0) print 0; else printf("%d\n", ($3*100)/$2) }'
}

check_disk() {
  local used
  used="$(disk_used_percent || echo 0)"
  if [ "$used" -ge "$DISK_CRIT" ]; then
    send_alert "disk" "critical" "Disk usage is ${used}% (>= ${DISK_CRIT}%)."
  elif [ "$used" -ge "$DISK_WARN" ]; then
    send_alert "disk" "warn" "Disk usage is ${used}% (>= ${DISK_WARN}%)."
  fi
}

check_memory() {
  local used
  used="$(mem_used_percent || echo 0)"
  if [ "$used" -ge "$MEM_CRIT" ]; then
    send_alert "memory" "critical" "Memory usage is ${used}% (>= ${MEM_CRIT}%)."
  elif [ "$used" -ge "$MEM_WARN" ]; then
    send_alert "memory" "warn" "Memory usage is ${used}% (>= ${MEM_WARN}%)."
  fi
}

log "vps-monitor: start"
check_disk
check_memory
log "vps-monitor: done"

