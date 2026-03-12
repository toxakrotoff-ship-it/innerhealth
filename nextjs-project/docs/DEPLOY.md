# Подготовка к деплою — Inner Health

По [официальной документации Next.js](https://nextjs.org/docs/app/building-your-application/deploying) и [self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

## Требования

- **Node.js** 20.9+ (рекомендуется LTS)
- **PostgreSQL** — БД для Prisma
- Переменные окружения из `.env.example` (скопировать в `.env` или задать в панели хостинга)

## Скрипты (package.json)

| Команда | Назначение |
|--------|------------|
| `npm run dev` | Режим разработки (Turbopack по умолчанию в Next 16) |
| `npm run dev:webpack` | Режим разработки на Webpack (если Turbopack даёт ошибки кэша) |
| `npm run build` | Сборка для продакшена |
| `npm run start` | Запуск продакшен-сервера после `build` |
| `npm run deploy:check` | Линт + сборка (проверка перед деплоем / в CI) |

## Переменные окружения

1. Скопируйте `.env.example` в `.env` или `.env.local` и заполните.
2. **Обязательные для деплоя:**
   - `DATABASE_URL` — строка подключения PostgreSQL
   - `NEXTAUTH_SECRET` — не менее 32 символов (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — полный URL сайта (например `https://your-domain.com`)
   - `NEXT_PUBLIC_SITE_URL` — то же для sitemap, robots, писем
   - `ADMIN_SECRET_PATH` — секретный путь к админке (по умолчанию `admin-panel`)
   - `SETTINGS_ENCRYPTION_KEY` — ключ шифрования настроек в БД

Остальные переменные описаны в `.env.example`.

## Пошаговый деплой (Node.js сервер)

```bash
# 1. Установка зависимостей
npm ci

# 2. Генерация Prisma Client (уже в postinstall)
npm run db:generate

# 3. Миграции БД (на сервере или отдельным шагом)
npm run db:migrate

# 4. Проверка перед деплоем (линт + сборка)
npm run deploy:check

# 5. Сборка
npm run build

# 6. Запуск
npm run start
```

Порт по умолчанию: `3000`. Задать свой: `PORT=4000 npm run start`.

## Standalone (output: 'standalone')

В проекте включён `output: 'standalone'` в `next.config.ts`. После `npm run build` создаётся минимальный образ приложения в `.next/standalone/`.

Запуск в режиме standalone:

```bash
node .next/standalone/server.js
```

При этом текущая рабочая директория должна быть корнем проекта (где лежит `package.json`), т.к. сервер ожидает рядом папку `public` и `.next/static`. При деплое в Docker копируют `standalone`, `public` и `.next/static` — см. [Next.js Docker standalone](https://github.com/vercel/next.js/tree/canary/examples/with-docker).

## Несколько инстансов (load balancer)

При запуске нескольких экземпляров за балансировщиком:

1. Задайте **одний и тот же** ключ на всех инстансах (при сборке):
   ```bash
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(openssl rand -base64 32)" npm run build
   ```
2. Задайте версию деплоя для защиты от version skew при rolling deploy:
   ```bash
   DEPLOYMENT_VERSION="v1.0.0" npm run build
   ```
   Или передайте `DEPLOYMENT_VERSION` в `next.config` через переменную окружения (уже настроено).

## Обратный прокси (nginx)

Рекомендуется держать Next.js за reverse proxy (nginx, Caddy и т.п.) для ограничения размера тела запроса, rate limiting и TLS. Для стриминга отключите буферизацию, например в nginx:

```nginx
proxy_set_header X-Accel-Buffering no;
```

## Если в dev появляются ошибки

- **«Persisting failed» / SST (Turbopack):** удалите `.next` и снова запустите `npm run dev`, либо используйте `npm run dev:webpack`.
- **ENOENT манифестов (routes-manifest и т.д.):** не используйте обёртки вокруг `next dev`; запускайте `npm run dev` или `npm run dev:webpack`. При необходимости очищайте `.next` и перезапускайте.
