#!/usr/bin/env bash
set -euo pipefail

# Ночная синхронизация кэша СДЭК: полный дамп ПВЗ по регионам РФ + прогрев
# тарифов до популярных/реально используемых городов. Раз в сутки, ночью —
# см. установку строки в install-vps-safeguards.sh (02:30 по времени хоста,
# который сейчас Europe/Moscow).
#
# Долгий прогон (десятки регионов + десятки городов * весовые бакеты, каждый
# со своими ретраями на стороне приложения) — --max-time большой, чтобы не
# оборвать curl раньше, чем ответит сервер.
#
# Required env:
# - SITE_URL: e.g. https://innerhealth.ru
# - CDEK_CACHE_SYNC_TOKEN: должен совпадать с одноимённой переменной в .env приложения

SITE_URL="${SITE_URL:-}"
CDEK_CACHE_SYNC_TOKEN="${CDEK_CACHE_SYNC_TOKEN:-}"

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
    log "cdek-cache-sync: missing env $name"
    exit 1
  fi
}

require_env "SITE_URL" "$SITE_URL"
require_env "CDEK_CACHE_SYNC_TOKEN" "$CDEK_CACHE_SYNC_TOKEN"

URL="${SITE_URL%/}/api/cron/cdek-cache-sync"

# --max-time 1800 (30 минут) — с запасом на ретраи по всем регионам/городам.
RESPONSE="$(curl -fsS --max-time 1800 -X POST "$URL" \
  -H "x-cron-token: ${CDEK_CACHE_SYNC_TOKEN}" \
  -w '\nHTTP %{http_code} in %{time_total}s' || true)"

log "cdek-cache-sync: ${RESPONSE//$'\n'/ | }"
