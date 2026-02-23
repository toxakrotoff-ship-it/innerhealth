#!/usr/bin/env bash
#
# Перенос локальной БД в прод одной командой (без рук).
# Запуск с локальной машины из каталога nextjs-project:
#   ./deploy/transfer-db-to-prod.sh
#
# Требуется: pg_dump и ssh-доступ к VPS. На Mac: brew install libpq
#
# Переменные окружения:
#   PROD_HOST       — хост VPS (обязательно)
#   PROD_USER       — SSH-пользователь (по умолчанию: $USER)
#   PROD_PATH       — путь к nextjs-project на VPS (по умолчанию: /opt/innerhealth/nextjs-project)
#   PROD_POSTGRES_USER — пользователь БД на проде (по умолчанию: innerhealth)
#   PROD_POSTGRES_DB   — имя БД на проде (по умолчанию: innerhealth)
#   SKIP_CONFIRM    — 1 = не спрашивать подтверждение перезаписи прод-БД
#

set -e
cd "$(dirname "$0")/.."

# Локальный .env (DATABASE_URL для pg_dump); .env.local перекрывает .env
if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi
if [ -f .env.local ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Ошибка: DATABASE_URL не задан. Заполните .env или .env.local в nextjs-project."
  exit 1
fi

if [ -z "${PROD_HOST:-}" ]; then
  echo "Ошибка: задайте PROD_HOST (хост VPS)."
  echo "Пример: PROD_HOST=my-server.ru ./deploy/transfer-db-to-prod.sh"
  exit 1
fi

PROD_USER="${PROD_USER:-$USER}"
PROD_PATH="${PROD_PATH:-/opt/innerhealth/nextjs-project}"
PROD_POSTGRES_USER="${PROD_POSTGRES_USER:-innerhealth}"
PROD_POSTGRES_DB="${PROD_POSTGRES_DB:-innerhealth}"

if [ "${SKIP_CONFIRM:-0}" != "1" ]; then
  echo "Будет выполнено: дамп локальной БД → восстановление на $PROD_HOST (контейнер db)."
  echo "Продовая БД будет перезаписана. Продолжить? [y/N]"
  read -r ans
  if [ "$ans" != "y" ] && [ "$ans" != "Y" ]; then
    echo "Отменено."
    exit 0
  fi
fi

echo "==> Дамп локальной БД..."
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Ошибка: pg_dump не найден. Установите клиент PostgreSQL (на Mac: brew install libpq, затем добавьте в PATH)."
  exit 1
fi

echo "==> Передача и восстановление на $PROD_HOST..."
pg_dump "$DATABASE_URL" -F p --no-owner --no-acl --clean --if-exists \
  | ssh "${PROD_USER}@${PROD_HOST}" "cd ${PROD_PATH} && docker compose exec -T db psql -U ${PROD_POSTGRES_USER} -d ${PROD_POSTGRES_DB}"

echo "==> Готово. Продовая БД обновлена из локальной."
