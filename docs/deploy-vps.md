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

Миграции БД выполняются при старте контейнера `app` (переменная `RUN_MIGRATE=1` в docker-compose).

## Ручной запуск без скрипта

```bash
cd /opt/innerhealth/nextjs-project
git pull
docker compose build --no-cache
docker compose up -d
```

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

## Полезные команды

- Логи: `docker compose logs -f app`
- Остановить: `docker compose down`
- Только пересобрать приложение: `docker compose up -d --build app`
- Зайти в контейнер: `docker compose exec app sh`

## Структура деплоя

- **app** — Next.js (standalone), порт 3000 внутри сети.
- **db** — PostgreSQL 16, данные в volume `postgres_data`.
- **nginx** — обратный прокси на 80/443, статика и проксирование на `app:3000`.

Файлы конфигурации:

- `Dockerfile` — сборка Next.js с `output: 'standalone'`.
- `docker-compose.yml` — сервисы app, db, nginx.
- `deploy/nginx/` — конфиги Nginx (основной и conf.d).
- `deploy/deploy.sh` — скрипт деплоя.
- `deploy/transfer-db-to-prod.sh` — перенос локальной БД в прод по SSH (без рук).
