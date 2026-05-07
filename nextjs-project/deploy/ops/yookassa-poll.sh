#!/usr/bin/env bash
set -euo pipefail

# Background poller for ЮKassa pending orders.
#
# Назначение: подстраховка webhook'а ЮKassa. Если уведомление не дошло
# (или дошло, но было отбито IP-фильтром / упало на верификации),
# этот скрипт раз в минуту дёргает приложение, и оно само опросит
# ЮKassa по всем pending-заказам в окне 7 дней с throttling по возрасту.
#
# Required env:
# - SITE_URL: e.g. https://innerhealth.ru
# - YOOKASSA_POLL_TOKEN: должен совпадать с одноимённой переменной в .env приложения
#
# Optional env:
# - DAYS: глубина просмотра (default 7)
# - TAKE: ограничение на размер пачки за один прогон (default 100)

SITE_URL="${SITE_URL:-}"
YOOKASSA_POLL_TOKEN="${YOOKASSA_POLL_TOKEN:-}"
DAYS="${DAYS:-7}"
TAKE="${TAKE:-100}"

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
    log "yookassa-poll: missing env $name"
    exit 1
  fi
}

require_env "SITE_URL" "$SITE_URL"
require_env "YOOKASSA_POLL_TOKEN" "$YOOKASSA_POLL_TOKEN"

URL="${SITE_URL%/}/api/cron/yookassa-poll?days=${DAYS}&take=${TAKE}"

# `--max-time 60` — крон работает раз в минуту, не блокируем следующий тик.
# Тело ответа в норме небольшое (json со статистикой); скидываем его в /dev/null,
# но логируем итог через -w.
RESPONSE="$(curl -fsS --max-time 60 -X POST "$URL" \
  -H "x-cron-token: ${YOOKASSA_POLL_TOKEN}" \
  -w '\nHTTP %{http_code} in %{time_total}s' || true)"

log "yookassa-poll: ${RESPONSE//$'\n'/ | }"
