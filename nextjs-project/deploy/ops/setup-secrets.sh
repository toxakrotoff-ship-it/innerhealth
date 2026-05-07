#!/usr/bin/env bash
set -euo pipefail

# Idempotent secrets bootstrap for Inner Health deployments.
#
# Гарантирует, что в `.env` приложения есть значения для всех секретов,
# которые требуются фоновым cron-скриптами и API-эндпоинтами:
#
# - YOOKASSA_POLL_TOKEN — для /api/cron/yookassa-poll и yookassa-poll.sh
# - INFRA_ALERT_TOKEN   — для /api/admin/infra-alert и vps-monitor.sh
#
# Если переменная отсутствует/пуста — генерируется криптостойкий
# случайный токен (`openssl rand -hex 32`) и дописывается в .env.
# Уже выставленные значения никогда не переписываются.
#
# Использование (из любого места):
#   ENV_FILE=/path/to/.env ./deploy/ops/setup-secrets.sh
# По умолчанию ENV_FILE = <nextjs-project>/.env (рядом с docker-compose.yml).
#
# Пишет ровно те переменные, которых нет — так что повторный запуск
# на работающем продакшене ничего не ломает.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/.env}"

REQUIRED_SECRETS=(
  "YOOKASSA_POLL_TOKEN"
  "INFRA_ALERT_TOKEN"
)

timestamp() {
  date -Is 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z'
}

log() {
  echo "[$(timestamp)] setup-secrets: $*"
}

generate_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi
  if [ -r /dev/urandom ]; then
    head -c 32 /dev/urandom | xxd -p -c 64
    return
  fi
  log "ERROR: neither openssl nor /dev/urandom available; cannot generate secret"
  exit 1
}

# Возвращает значение переменной из .env (без интерполяции; «KEY=VALUE» с любыми кавычками).
read_env_value() {
  local key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    echo ""
    return
  fi
  awk -F= -v key="$key" '
    BEGIN { found = 0 }
    /^[[:space:]]*#/ { next }
    {
      sub(/^[[:space:]]+/, "", $0)
      sub(/[[:space:]]+$/, "", $0)
    }
    $1 == key {
      sub(/^[^=]+=/, "", $0)
      # Снимаем парные кавычки (двойные и одинарные), если они обрамляют значение.
      if (length($0) >= 2) {
        first = substr($0, 1, 1)
        last  = substr($0, length($0), 1)
        if ((first == "\"" && last == "\"") || (first == "'\''" && last == "'\''")) {
          $0 = substr($0, 2, length($0) - 2)
        }
      }
      print $0
      found = 1
      exit
    }
    END {
      if (!found) print ""
    }
  ' "$ENV_FILE"
}

ensure_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    log "creating empty $ENV_FILE"
    install -m 600 /dev/null "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE" 2>/dev/null || true
}

append_secret() {
  local key="$1"
  local value="$2"
  # Перед добавлением гарантируем перевод строки в конце файла.
  if [ -s "$ENV_FILE" ] && [ "$(tail -c 1 "$ENV_FILE" | wc -l | tr -d ' ')" -eq 0 ]; then
    printf '\n' >>"$ENV_FILE"
  fi
  printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
}

ensure_env_file

added=0
for key in "${REQUIRED_SECRETS[@]}"; do
  current="$(read_env_value "$key")"
  if [ -n "$current" ]; then
    log "${key} already present, skip"
    continue
  fi
  value="$(generate_token)"
  append_secret "$key" "$value"
  added=$((added + 1))
  log "${key} generated and added to $(basename "$ENV_FILE")"
done

log "done (added: ${added})"
