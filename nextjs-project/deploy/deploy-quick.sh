#!/usr/bin/env bash
# Быстрое обновление приложения и бота без полной пересборки (db, nginx не трогаем).
# Использование: из каталога nextjs-project: ./deploy/deploy-quick.sh

set -e
# Каталог с docker-compose (nextjs-project) — сюда вернёмся для сборки
DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DEPLOY_DIR"
# Репозиторий может быть на уровень выше (innerhealth)
GIT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$GIT_ROOT"

echo "==> Pulling latest from repo (code + prisma/migrations)..."
git fetch origin
git reset --hard "origin/$(git branch --show-current)"

cd "$DEPLOY_DIR"

echo "==> Building app from repo (with cache)..."
docker compose build app

echo "==> Migration status (before deploy)..."
docker compose run --rm app npx prisma migrate status || true

echo "==> Applying migrations from repo..."
docker compose run --rm app npx prisma migrate deploy

echo "==> Restarting app..."
docker compose up -d app

echo "==> Building telegram-bot (кэш, быстро)..."
docker compose build telegram-bot
docker compose up -d telegram-bot

echo "==> Перезапуск контейнеров app и telegram-bot..."
docker compose restart app telegram-bot

echo "==> Cleaning up (dangling images, build cache)..."
docker image prune -f
docker builder prune -f 2>/dev/null || true

echo "==> Done."
docker compose ps
