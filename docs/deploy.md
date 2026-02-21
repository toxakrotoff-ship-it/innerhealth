# Deployment Guide

## Руководство по развертыванию

- Настройка production окружения
- Настройка CI/CD pipeline
- Развертывание на VPS
- Настройка доменного имени
- Настройка SSL сертификатов
- Мониторинг производительности

## База данных и миграции Prisma

Перед деплоем приложения обязательно применить миграции к production-БД. Подробно: **[Prisma: миграции и подготовка к деплою](./prisma-migrations-and-deploy.md)**.

Кратко:

1. Задать `DATABASE_URL` в окружении прода.
2. Выполнить в папке `nextjs-project`: `npm run db:migrate` (или `npx prisma migrate deploy`).
3. Затем: `npm run build` и `npm run start`.