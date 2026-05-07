#!/usr/bin/env bash
set -euo pipefail

# Install/refresh VPS safeguards for Inner Health.
#
# Что ставит:
#   - /opt/innerhealth/ops/docker-maintenance.sh (раз в сутки)
#   - /opt/innerhealth/ops/vps-monitor.sh        (раз в 5 минут — алерты диск/память)
#   - /opt/innerhealth/ops/yookassa-poll.sh      (раз в минуту — фолбэк-поллер ЮKassa)
#
# Идемпотентно: повторный запуск обновляет скрипты и cron-строки.
#
# Вызов:
#   - Интерактивно (как было):  sudo ./deploy/ops/install-vps-safeguards.sh
#   - Без вопросов:             sudo -E ./deploy/ops/install-vps-safeguards.sh --non-interactive
#
# Источники конфигурации (по приоритету, побеждает первое непустое):
#   1) Переменные окружения вызова: SITE_URL, INFRA_ALERT_TOKEN, YOOKASSA_POLL_TOKEN
#   2) ENV_FILE (по умолчанию <nextjs-project>/.env)
#       — оттуда же читаем NEXTAUTH_URL, если SITE_URL не задан
#   3) Интерактивный ввод (если STDIN привязан к терминалу и не задано --non-interactive)
#
# Несколько вызовов подряд из деплоя безопасны: cron-строки помечаются маркером
# `# innerhealth-ops` и при перезаписи только они и заменяются.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OPS_SRC="${PROJECT_ROOT}/deploy/ops"

TARGET_DIR="${TARGET_DIR:-/opt/innerhealth}"
TARGET_SCRIPTS_DIR="${TARGET_SCRIPTS_DIR:-${TARGET_DIR}/ops}"
ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/.env}"
CRON_MARKER="# innerhealth-ops"

NON_INTERACTIVE=0
for arg in "$@"; do
  case "$arg" in
    --non-interactive|-y)
      NON_INTERACTIVE=1
      ;;
    --help|-h)
      sed -n '1,40p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

timestamp() {
  date -Is 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z'
}

log() {
  echo "[$(timestamp)] install-vps-safeguards: $*"
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    log "ERROR: must run as root (writes to /opt and crontab). Use sudo."
    exit 1
  fi
}

# Парсим переменную из .env (без интерполяции).
read_env_value() {
  local key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    echo ""
    return
  fi
  awk -F= -v key="$key" '
    /^[[:space:]]*#/ { next }
    {
      sub(/^[[:space:]]+/, "", $0)
      sub(/[[:space:]]+$/, "", $0)
    }
    $1 == key {
      sub(/^[^=]+=/, "", $0)
      if (length($0) >= 2) {
        first = substr($0, 1, 1)
        last  = substr($0, length($0), 1)
        if ((first == "\"" && last == "\"") || (first == "'\''" && last == "'\''")) {
          $0 = substr($0, 2, length($0) - 2)
        }
      }
      print $0
      exit
    }
  ' "$ENV_FILE"
}

resolve_value() {
  local key="$1"
  local current="${!key:-}"
  if [ -n "$current" ]; then
    echo "$current"
    return
  fi
  read_env_value "$key"
}

prompt_value() {
  local label="$1"
  local current="$2"
  local out
  if [ -n "$current" ]; then
    echo "$current"
    return
  fi
  if [ "$NON_INTERACTIVE" = "1" ] || [ ! -t 0 ]; then
    log "ERROR: ${label} is not set and --non-interactive is in effect"
    return 1
  fi
  read -rp "${label}: " out
  if [ -z "$out" ]; then
    log "ERROR: ${label} is required"
    return 1
  fi
  echo "$out"
}

require_root

if [ ! -d "${OPS_SRC}" ]; then
  log "ERROR: ops directory not found at ${OPS_SRC}"
  exit 1
fi

SITE_URL="$(resolve_value SITE_URL || true)"
if [ -z "$SITE_URL" ]; then
  # NEXTAUTH_URL — наш канонический URL приложения, подойдёт как SITE_URL.
  SITE_URL="$(read_env_value NEXTAUTH_URL || true)"
fi
SITE_URL="$(prompt_value 'Site URL (e.g. https://innerhealth.ru)' "$SITE_URL")"

INFRA_ALERT_TOKEN="$(resolve_value INFRA_ALERT_TOKEN || true)"
INFRA_ALERT_TOKEN="$(prompt_value 'Infra alert token (== INFRA_ALERT_TOKEN in app .env)' "$INFRA_ALERT_TOKEN")"

YOOKASSA_POLL_TOKEN="$(resolve_value YOOKASSA_POLL_TOKEN || true)"
YOOKASSA_POLL_TOKEN="$(prompt_value 'ЮKassa poll token (== YOOKASSA_POLL_TOKEN in app .env)' "$YOOKASSA_POLL_TOKEN")"

log "Creating ${TARGET_SCRIPTS_DIR}..."
mkdir -p "${TARGET_SCRIPTS_DIR}"

log "Copying scripts (overwrite)..."
install -m 0755 "${OPS_SRC}/docker-maintenance.sh" "${TARGET_SCRIPTS_DIR}/docker-maintenance.sh"
install -m 0755 "${OPS_SRC}/vps-monitor.sh"        "${TARGET_SCRIPTS_DIR}/vps-monitor.sh"
install -m 0755 "${OPS_SRC}/yookassa-poll.sh"      "${TARGET_SCRIPTS_DIR}/yookassa-poll.sh"

log "Refreshing cron entries (replace lines tagged with '${CRON_MARKER}')..."
CRON_TEMP="$(mktemp)"
trap 'rm -f "${CRON_TEMP}"' EXIT

# Берём текущий crontab без наших старых строк (по маркеру).
crontab -l 2>/dev/null | grep -vF "${CRON_MARKER}" >"${CRON_TEMP}" || true

cat >>"${CRON_TEMP}" <<EOF
# Inner Health VPS safeguards (managed by install-vps-safeguards.sh) ${CRON_MARKER}
30 3 * * * ${TARGET_SCRIPTS_DIR}/docker-maintenance.sh ${CRON_MARKER}
*/5 * * * * SITE_URL="${SITE_URL}" INFRA_ALERT_TOKEN="${INFRA_ALERT_TOKEN}" ${TARGET_SCRIPTS_DIR}/vps-monitor.sh ${CRON_MARKER}
* * * * * SITE_URL="${SITE_URL}" YOOKASSA_POLL_TOKEN="${YOOKASSA_POLL_TOKEN}" ${TARGET_SCRIPTS_DIR}/yookassa-poll.sh ${CRON_MARKER}
EOF

crontab "${CRON_TEMP}"

log "Done. Scripts: ${TARGET_SCRIPTS_DIR}"
log "Cron entries refreshed (3 lines tagged '${CRON_MARKER}'):"
crontab -l | grep -F "${CRON_MARKER}" | sed -e 's/INFRA_ALERT_TOKEN="[^"]*"/INFRA_ALERT_TOKEN="***"/' \
                                              -e 's/YOOKASSA_POLL_TOKEN="[^"]*"/YOOKASSA_POLL_TOKEN="***"/'

log "Reminder: INFRA_ALERT_TOKEN and YOOKASSA_POLL_TOKEN must match the app's .env values."
