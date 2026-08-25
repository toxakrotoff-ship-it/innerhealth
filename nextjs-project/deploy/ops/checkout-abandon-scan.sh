#!/usr/bin/env bash
set -euo pipefail

# Background scanner: помечает зависшие checkout-сессии (незавершённые оформления)
# как ABANDONED, если активности не было дольше таймаута (ТЗ §10).
#
# Не критична по задержке — достаточно раз в 5-10 минут, в отличие от
# yookassa-poll.sh (платежи опрашиваются чаще).
#
# Required env:
# - SITE_URL: e.g. https://innerhealth.ru
# - CHECKOUT_ABANDON_SCAN_TOKEN: должен совпадать с одноимённой переменной в .env приложения
#
# Optional env:
# - MINUTES: таймаут без активности (default — CHECKOUT_ABANDON_TIMEOUT_MINUTES на сервере, обычно 60)
# - TAKE: размер пачки за один прогон (default 500)

SITE_URL="${SITE_URL:-}"
CHECKOUT_ABANDON_SCAN_TOKEN="${CHECKOUT_ABANDON_SCAN_TOKEN:-}"
MINUTES="${MINUTES:-}"
TAKE="${TAKE:-500}"

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
    log "checkout-abandon-scan: missing env $name"
    exit 1
  fi
}

require_env "SITE_URL" "$SITE_URL"
require_env "CHECKOUT_ABANDON_SCAN_TOKEN" "$CHECKOUT_ABANDON_SCAN_TOKEN"

URL="${SITE_URL%/}/api/cron/checkout-abandon-scan?take=${TAKE}"
if [ -n "$MINUTES" ]; then
  URL="${URL}&minutes=${MINUTES}"
fi

RESPONSE="$(curl -fsS --max-time 60 -X POST "$URL" \
  -H "x-cron-token: ${CHECKOUT_ABANDON_SCAN_TOKEN}" \
  -w '\nHTTP %{http_code} in %{time_total}s' || true)"

log "checkout-abandon-scan: ${RESPONSE//$'\n'/ | }"
