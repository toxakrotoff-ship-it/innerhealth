#!/usr/bin/env bash
set -euo pipefail

# Install VPS safeguards for Inner Health:
# - copies ops scripts to /opt/innerhealth
# - sets up cron for docker cleanup and infra monitor
#
# Usage (on VPS, from nextjs-project root):
#   ./deploy/ops/install-vps-safeguards.sh
#
# Idempotent: running multiple times updates scripts and cron entry.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# This script lives in: <nextjs-project>/deploy/ops/
# Therefore ops source directory is: <nextjs-project>/deploy/ops
OPS_SRC="${PROJECT_ROOT}/deploy/ops"

TARGET_DIR="/opt/innerhealth"
TARGET_SCRIPTS_DIR="${TARGET_DIR}/ops"

log() {
  echo "[$(date -Is)] $*"
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    log "This script should be run as root (for /opt and cron). Use sudo."
    exit 1
  fi
}

require_root

if [ ! -d "${OPS_SRC}" ]; then
  log "Ops directory not found at ${OPS_SRC}."
  exit 1
fi

read -rp "Site URL for monitor (e.g. https://innerhaealth.inetrnet.pp.ru): " SITE_URL
if [ -z "${SITE_URL}" ]; then
  log "SITE_URL is required."
  exit 1
fi

read -rp "Infra alert token (will be used for INFRA_ALERT_TOKEN and x-infra-alert-token): " INFRA_ALERT_TOKEN
if [ -z "${INFRA_ALERT_TOKEN}" ]; then
  log "INFRA_ALERT_TOKEN is required."
  exit 1
fi

log "Creating target directories under ${TARGET_SCRIPTS_DIR}..."
mkdir -p "${TARGET_SCRIPTS_DIR}"

log "Copying scripts..."
cp "${OPS_SRC}/docker-maintenance.sh" "${TARGET_SCRIPTS_DIR}/docker-maintenance.sh"
cp "${OPS_SRC}/vps-monitor.sh" "${TARGET_SCRIPTS_DIR}/vps-monitor.sh"
chmod +x "${TARGET_SCRIPTS_DIR}/docker-maintenance.sh" "${TARGET_SCRIPTS_DIR}/vps-monitor.sh"

log "Installing cron jobs..."
CRON_TEMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v "innerhealth-ops" || true >"${CRON_TEMP}"

{
  echo "# InnerHealth VPS safeguards (innerhealth-ops)"
  echo "30 3 * * * ${TARGET_SCRIPTS_DIR}/docker-maintenance.sh # innerhealth-ops"
  echo "*/5 * * * * SITE_URL=\"${SITE_URL}\" INFRA_ALERT_TOKEN=\"${INFRA_ALERT_TOKEN}\" ${TARGET_SCRIPTS_DIR}/vps-monitor.sh # innerhealth-ops"
} >>"${CRON_TEMP}"

crontab "${CRON_TEMP}"
rm -f "${CRON_TEMP}"

log "Done. Scripts installed to ${TARGET_SCRIPTS_DIR} and cron updated."
log "Make sure INFRA_ALERT_TOKEN='${INFRA_ALERT_TOKEN}' is also set in the app environment."

