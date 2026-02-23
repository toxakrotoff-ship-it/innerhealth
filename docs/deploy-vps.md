# Деплой на VPS (Ubuntu)

Деплой в пару кликов через Docker и Nginx.

## Требования на VPS

- Ubuntu (голая или с минимумом пакетов)
- Docker и Docker Compose
- Git (если деплой через `git pull`)

## Однократная подготовка VPS

### 1. Установка Docker и Docker Compose

```bash
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# Выйти и зайти в сессию или: newgrp docker
```

### 2. Клонирование репозитория и настройка .env

```bash
cd /opt  # или свой каталог
git clone https://github.com/toxakrotoff-ship-it/innerhealth.git innerhealth
cd innerhealth/nextjs-project
```

**Файл `.env` на сервере** — один из двух вариантов:

- **Перенести с локальной машины:**  
  `scp nextjs-project/.env.local user@82.202.159.85:/opt/innerhealth/nextjs-project/.env`  
  (или `scp .env ...` если используете `.env`). Затем по SSH проверьте продовые значения (см. ниже).

- **Создать вручную:** откройте `docs/env's.md`, создайте `.env` в каталоге `nextjs-project` на сервере и заполните переменные.

В обоих случаях обязательно проверьте/задайте для прода:

- `NEXTAUTH_URL` — домен прода (например `https://innerhealth.ru`).
- `NEXTAUTH_SECRET`, ключи YooKassa, CDEK, Telegram, SMTP и т.д.
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — если нужны не дефолтные; `DATABASE_URL` в docker-compose подставляется из них, в .env можно не дублировать.
- **Telegram-бот:** в `docker-compose.yml` для сервиса `telegram-bot` уже задано `TELEGRAM_SITE_URL: http://app:3000` — так бот из своего контейнера ходит в контейнер приложения по имени сервиса `app`. Переопределять в `.env` не нужно.

```bash
nano .env   # или vim
```

### 3. (Опционально) SSL через Let's Encrypt

На хосте:

```bash
sudo apt install certbot
sudo certbot certonly --webroot -w /var/lib/certbot -d innerhealth.ru -d www.innerhealth.ru
```y

Смонтировать сертификаты в Nginx: в `docker-compose.yml` для сервиса `nginx` добавить volume:

```yaml
volumes:
  - /etc/letsencrypt/live/innerhealth.ru/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
  - /etc/letsencrypt/live/innerhealth.ru/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```

Раскомментировать HTTPS-блок в `deploy/nginx/conf.d/default.conf` и включить редирект с HTTP на HTTPS в HTTP-блоке. Перезапустить контейнеры:

```bash
docker compose up -d --force-recreate nginx
```

## Деплой в пару кликов

Из каталога `nextjs-project`:

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Скрипт делает:

1. `git pull`
2. `docker compose build --no-cache`
3. `docker compose up -d`

Миграции при старте отключены (`RUN_MIGRATE=0`), чтобы не трогать уже перенесённую БД. Запустить миграции вручную при необходимости: `docker compose run --rm app npx prisma migrate deploy`. Чтобы снова включить автозапуск миграций при старте app, задайте в `.env`: `RUN_MIGRATE=1`.

## Ручной запуск без скрипта

```bash
cd /opt/innerhealth/nextjs-project
git pull
docker compose build --no-cache
docker compose up -d
```

### Права на каталог загрузок (uploads)

Контейнер `app` работает от пользователя `nextjs` (uid 1001). Чтобы загрузка изображений в админке (новости/статьи) не падала с **EACCES**, на сервере каталог `public/uploads` должен быть доступен на запись для uid 1001:

```bash
cd /opt/innerhealth/nextjs-project
sudo mkdir -p public/uploads public/uploads/posts public/uploads/products
sudo chown -R 1001:1001 public/uploads
```

После первого выполнения перезапуск контейнеров не нужен.

Превью загрузок в редакторе отдаёт **nginx** (location `/uploads/` → каталог `public/uploads`), так как Next.js в режиме `standalone` не раздаёт папку `public/`. Конфиг и volume для nginx уже настроены в `docker-compose.yml` и `deploy/nginx/conf.d/default.conf`.

## Перенос локальной БД в прод (без рук)

Скрипт с локальной машины делает дамп локальной БД и восстанавливает его в продовом контейнере `db` по SSH. Продовая БД перезаписывается.

**Требования:** на локальной машине установлен `pg_dump` (на Mac: `brew install libpq`, при необходимости добавьте в PATH: `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"`).

**Один раз задайте переменные** (или экспортируйте в профиле):

```bash
export PROD_HOST=your-server.ru
export PROD_USER=root              # опционально, по умолчанию $USER
export PROD_PATH=/opt/innerhealth/nextjs-project   # опционально
```

**Запуск** из каталога `nextjs-project`:

```bash
chmod +x deploy/transfer-db-to-prod.sh
./deploy/transfer-db-to-prod.sh
```

Скрипт возьмёт `DATABASE_URL` из `.env` или `.env.local`, спросит подтверждение и выполнит дамп → передачу по SSH → восстановление в контейнер `db` на VPS. Без подтверждения (например, в CI): `SKIP_CONFIRM=1 ./deploy/transfer-db-to-prod.sh`.

Если на проде другие пользователь/БД PostgreSQL, задайте `PROD_POSTGRES_USER` и `PROD_POSTGRES_DB`.

## Изображения с Tilda (static.tildacdn)

Все изображения с `static.tildacdn.com` хранятся в проекте в `public/uploads/tilda/`. Ниже — точные команды в двух вариантах: **на VPS** (одноразовый контейнер) или **локально + rsync**.

---

### Вариант A: Всё на VPS (одноразовый контейнер)

Подключитесь по SSH и выполните по порядку (подставьте свой пароль БД вместо `YOUR_DB_PASSWORD` или возьмите из `.env` на сервере: `POSTGRES_PASSWORD`).

```bash
ssh user1@82.202.159.85
```

На сервере:

```bash
cd /opt/innerhealth/nextjs-project

# Обязательно: подтянуть код (в т.ч. scripts/download-tildacdn-images-to-local.ts)
git pull

# Создать папку загрузок, если ещё нет
mkdir -p public/uploads

# Запустить скрипт в одноразовом контейнере (сеть и volume как у app)
# Замените YOUR_DB_PASSWORD на пароль БД из .env (переменная POSTGRES_PASSWORD)
docker run --rm \
  --network nextjs-project_default \
  -v "$(pwd):/app" \
  -v "$(pwd)/public/uploads:/app/public/uploads" \
  -w /app \
  -e DATABASE_URL="postgresql://innerhealth:YOUR_DB_PASSWORD@db:5432/innerhealth" \
  node:20-alpine \
  sh -c "npm ci && npx prisma generate && npm run tilda:download-images"
```

Если имя сети другое (ошибка про network), посмотрите: `docker network ls` и замените `nextjs-project_default` на имя сети, к которой подключён контейнер `db`.

Готово: файлы в `public/uploads/tilda/`, БД обновлена. Контейнер app уже монтирует `./public/uploads`, перезапуск не обязателен.

---

### Вариант B: Локально + синхронизация на VPS

**Шаг 1 — на своей машине** (в каталоге репозитория, где есть Node и npm):

```bash
cd /Users/anton.krotov/Desktop/innerhealth/nextjs-project
```

Задайте продовый `DATABASE_URL`. Если БД с хоста до VPS недоступна, поднимите туннель в отдельном терминале:

```bash
ssh -L 5432:127.0.0.1:5432 user1@82.202.159.85
```

На VPS должен быть проброс порта БД (в `docker-compose` у сервиса `db` добавьте, если ещё нет: `ports: - "127.0.0.1:5432:5432"` и перезапустите `db`). В другом терминале:

```bash
cd /Users/anton.krotov/Desktop/innerhealth/nextjs-project

export DATABASE_URL="postgresql://innerhealth:YOUR_DB_PASSWORD@localhost:5432/innerhealth"
npm run tilda:download-images
```

(Если БД доступна по другому адресу без туннеля — подставьте его в `DATABASE_URL` и просто выполните `npm run tilda:download-images`.)

**Шаг 2 — синхронизация папки загрузок на VPS:**

```bash
cd /Users/anton.krotov/Desktop/innerhealth/nextjs-project
mkdir -p public/uploads
rsync -avz public/uploads/ user1@82.202.159.85:/opt/innerhealth/nextjs-project/public/uploads/
```

**Шаг 3 — на VPS** (один раз создать каталог, если ещё не создан):

```bash
ssh user1@82.202.159.85
mkdir -p /opt/innerhealth/nextjs-project/public/uploads
exit
```

После rsync файлы уже лежат на сервере; контейнер app отдаёт их из смонтированного `./public/uploads`.

---

Режим проверки (ничего не скачивает и не меняет в БД): добавьте в конец команды `sh -c "..."` в варианте A флаг `--dry-run`; локально: `npx ts-node scripts/download-tildacdn-images-to-local.ts --dry-run`.

## Telegram-бот на проде

Бот запускается отдельным контейнером `telegram-bot` (long polling). В `.env` на сервере должны быть заданы `TELEGRAM_BOT_TOKEN`, `TELEGRAM_SERVICE_SECRET`; `TELEGRAM_SITE_URL` для контейнера бота подставляется в `http://app:3000` автоматически.

### Запустить только бота (не трогая app, db, nginx и БД)

На VPS, из каталога `nextjs-project`:

```bash
cd /opt/innerhealth/nextjs-project
git pull
docker compose build telegram-bot
docker compose up -d telegram-bot
```

Поднимается только контейнер бота; существующие app, db и nginx не пересоздаются и не перезапускаются. При первом запуске нужна сборка образа (в нём есть ts-node для бота).

Проверить логи:

```bash
docker compose logs -f telegram-bot
```

Перезапустить только бота: `docker compose up -d --force-recreate telegram-bot`.

## Полезные команды

- Логи: `docker compose logs -f app`
- Остановить: `docker compose down`
- Только пересобрать приложение: `docker compose up -d --build app`
- Зайти в контейнер: `docker compose exec app sh`

## Структура деплоя

- **app** — Next.js, порт 3000 внутри сети.
- **db** — PostgreSQL 16, данные в volume `postgres_data`.
- **telegram-bot** — Telegram-бот (long polling), ходит в API приложения по `http://app:3000`.
- **nginx** — обратный прокси на 80/443, статика и проксирование на `app:3000`.

Файлы конфигурации:

- `Dockerfile` — сборка Next.js с `output: 'standalone'`.
- `docker-compose.yml` — сервисы app, db, telegram-bot, nginx.
- `deploy/nginx/` — конфиги Nginx (основной и conf.d).
- `deploy/deploy.sh` — скрипт деплоя.
- `deploy/transfer-db-to-prod.sh` — перенос локальной БД в прод по SSH (без рук).
