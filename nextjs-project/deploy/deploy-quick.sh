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

echo "==> Building app image (with cache)..."
docker compose build app

echo "==> Migration status (before deploy)..."
docker compose run --rm app npx prisma migrate status || true

echo "==> Applying migrations from repo..."
docker compose run --rm app npx prisma migrate deploy

echo "==> Restarting app..."
docker compose up -d app

echo "==> Restarting telegram-bot (no separate build)..."
# В текущей конфигурации `telegram-bot` использует тот же image, что и `app`.
docker compose up -d --no-build telegram-bot

echo "==> Removing old telegram-bot image (if still present)..."
docker image rm nextjs-project-telegram-bot:latest || true

echo "==> Cleaning up Docker cache (safe)..."
docker image prune -f
# Builder cache может быть довольно объёмным после сборок.
# Не трогаем volumes, чтобы не потерять данные БД.
docker builder prune -af || true

echo "==> Done."
docker compose ps
