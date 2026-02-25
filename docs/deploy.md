# Deployment Guide

## Руководство по развертыванию

- **Настройка production окружения** — переменные в `docs/env's.md`.
- **Развертывание на VPS (Docker)** — пошагово: **[Деплой на VPS](./deploy-vps.md)** (Ubuntu, Docker, Nginx, SSL, Telegram-бот, перенос БД).
- Настройка доменного имени и SSL (Let's Encrypt) — в deploy-vps.md.
- **База данных и миграции** — см. ниже и **[Prisma: миграции и подготовка к деплою](./prisma-migrations-and-deploy.md)**.
- Настройка CI/CD pipeline и мониторинга — по необходимости.

Все команды деплоя выполняются из каталога **nextjs-project** (там находятся `Dockerfile`, `docker-compose.yml`, `deploy/`).

## Docker (кратко)

| Что | Путь |
|-----|------|
| **Dockerfile** | `nextjs-project/Dockerfile` — сборка Next.js с `output: 'standalone'` |
| **docker-compose** | `nextjs-project/docker-compose.yml` — сервисы app, db, telegram-bot, nginx |
| **Скрипт деплоя** | `nextjs-project/deploy/deploy.sh` — git pull, build, up |
| **Nginx** | `nextjs-project/deploy/nginx/` — конфиги обратного прокси и статики (/uploads) |
| **Перенос БД на прод** | `nextjs-project/deploy/transfer-db-to-prod.sh` |

- **Создание образов и запуск:** `docker compose build --no-cache && docker compose up -d`
- **Миграции:** по умолчанию при старте отключены (`RUN_MIGRATE=0`). Вручную: `docker compose run --rm app npx prisma migrate deploy`. Автозапуск: в `.env` задать `RUN_MIGRATE=1`.
- **Права на загрузки:** на хосте `public/uploads` — uid 1001: `sudo chown -R 1001:1001 nextjs-project/public/uploads`
- **База данных:** PostgreSQL в контейнере `db`, volume `postgres_data`. Переменные `POSTGRES_*` и `DATABASE_URL` — в `.env` или docker-compose.

Подробнее: **[Деплой на VPS](./deploy-vps.md)**.

## База данных и миграции Prisma

Перед деплоем приложения обязательно применить миграции к production-БД. Подробно: **[Prisma: миграции и подготовка к деплою](./prisma-migrations-and-deploy.md)**.

Кратко:

1. Задать `DATABASE_URL` в окружении прода (или в `.env` в nextjs-project; Prisma читает его через `prisma.config.ts`).
2. Выполнить в папке **nextjs-project**: `npm run db:migrate` (или `npx prisma migrate deploy`).
3. Затем: `npm run build` и `npm run start`. При деплое через Docker скрипт `deploy/deploy.sh` выполняет сборку и поднятие контейнеров.