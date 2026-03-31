#!/usr/bin/env bash
# Быстрое обновление приложения и бота без полной пересборки DB (nginx пересоздаём для актуального host-конфига).
# Использование: из каталога nextjs-project: ./deploy/deploy-quick.sh

set -euo pipefail
# Каталог с docker-compose (nextjs-project) — сюда вернёмся для сборки
DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"
# Репозиторий может быть на уровень выше (innerhealth)
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$GIT_ROOT"

echo "==> Pulling latest from repo (code + prisma/migrations)..."
git fetch --prune origin
CURRENT_BRANCH="$(git branch --show-current)"
if [ -z "${CURRENT_BRANCH}" ]; then
  echo "ERROR: Unable to detect current git branch."
  exit 1
fi
if ! git merge-base --is-ancestor "HEAD" "origin/${CURRENT_BRANCH}"; then
  echo "ERROR: Local branch has commits not in origin/${CURRENT_BRANCH}. Resolve manually before deploy."
  exit 1
fi
git pull --ff-only origin "${CURRENT_BRANCH}"

cd "$DEPLOY_DIR"

echo "==> Building app image (with cache)..."
docker compose build app

echo "==> Building bot image (with cache)..."
docker compose build telegram-bot

echo "==> Migration status (before deploy)..."
docker compose run --rm app npx prisma migrate status || true

echo "==> Applying migrations from repo..."
docker compose run --rm app npx prisma migrate deploy

echo "==> Restarting app..."
docker compose up -d --force-recreate app

echo "==> Restarting telegram-bot (no separate build)..."
# Telegram-боты используют отдельный bot image.
docker compose up -d --force-recreate --no-build telegram-bot telegram-bot-sprint

echo "==> Restarting max-bot (no separate build)..."
docker compose up -d --force-recreate --no-build max-bot max-bot-sprint

echo "==> Recreating nginx (pick up new host/domain config)..."
docker compose up -d --force-recreate nginx

echo "==> Removing old telegram-bot image (if still present)..."
docker image rm nextjs-project-telegram-bot:latest || true

echo "==> Cleaning up Docker cache (safe)..."
docker image prune -f
# Builder cache может быть довольно объёмным после сборок.
# Не трогаем volumes, чтобы не потерять данные БД.
docker builder prune -af || true

echo "==> Done."
docker compose ps
