# Запуск скрипта сравнения редиректов на VPS (Docker)

Скрипт `scripts/compare-sites-redirects.ts` обходит старый сайт (innerhealth.ru) и новый (приложение в Docker), делает матч по title и выводит CSV или импортирует редиректы в БД.

## Требования

- На VPS развёрнут проект через `docker compose` (сервисы `app`, `db` и т.д.).
- В каталоге `nextjs-project` есть `.env` с `DATABASE_URL` (для `--import-db`).

## После git pull — пересобрать образ

Скрипт и команда `redirects:compare` попадают в образ при сборке. После обновления кода (**git pull**) нужно пересобрать образ приложения:

```bash
cd /opt/innerhealth/nextjs-project   # или ваш путь к проекту
docker compose build app
```

После этого команды `docker compose run ... app npm run redirects:compare -- ...` будут находить скрипт.

## Команды на VPS (из каталога nextjs-project)

Все команды выполнять из каталога, где лежит `docker-compose.yml` (обычно `nextjs-project/`).

### 1. Только CSV (результат забрать с сервера)

Создайте каталог для вывода и запустите контейнер с монтированием тома (без `-v` файл останется только внутри контейнера и пропадёт):

```bash
mkdir -p data

docker compose run --rm -v "$(pwd)/data:/data" app npm run redirects:compare -- \
  https://innerhealth.ru \
  http://app:3000 \
  --match \
  --out /data/redirects.csv
```

Файл появится в `./data/redirects.csv` на хосте. Его можно скачать (scp/sftp) и загрузить в админке «Редиректы» → Импорт из CSV.

С лимитом страниц и задержкой:

```bash
docker compose run --rm -v "$(pwd)/data:/data" app npm run redirects:compare -- \
  https://innerhealth.ru \
  http://app:3000 \
  --match \
  --out /data/redirects.csv \
  --max-pages 500 \
  --delay 300
```

### 2. Импорт сразу в БД (контейнер использует DATABASE_URL из compose)

```bash
docker compose run --rm app npm run redirects:compare -- \
  https://innerhealth.ru \
  http://app:3000 \
  --match \
  --import-db
```

Переменная `DATABASE_URL` подставляется из `docker-compose.yml` (сервис `app`), контейнер подключается к сервису `db`.

### 3. CSV + импорт в БД

```bash
mkdir -p data

docker compose run --rm -v "$(pwd)/data:/data" app npm run redirects:compare -- \
  https://innerhealth.ru \
  http://app:3000 \
  --match \
  --out /data/redirects.csv \
  --import-db
```

### 4. Только расхождения (на новом сайте ответ не 200)

```bash
docker compose run --rm -v "$(pwd)/data:/data" app npm run redirects:compare -- \
  https://innerhealth.ru \
  http://app:3000 \
  --match \
  --discrepancies-only \
  --out /data/redirects.csv
```

## Матч по YML-экспорту Тильды (store-*.yml)

Если есть выгрузка каталога Тильды в формате YML (XML с `<offer>`, `<url>`, `<name>`), можно не обходить старый сайт, а взять старые URL и названия из файла и сматчить с новым сайтом по названию товара:

```bash
# Локально (путь к yml — на вашей машине)
npm run redirects:compare -- https://innerhealth.ru http://82.202.159.85 --yml /path/to/store-6292080-202602251308.yml --out redirects.csv

# В Docker: положите yml в каталог проекта и смонтируйте, либо скопируйте в контейнер
docker compose run --rm -v "$(pwd)/data:/data" -v "$(pwd)/store.yml:/app/store.yml:ro" app npm run redirects:compare -- https://innerhealth.ru http://app:3000 --yml /app/store.yml --out /data/redirects.csv
```

Скрипт парсит `<offer><url>` и `<offer><name>`, обходит только **новый** сайт, для каждого товара из YML подбирает страницу на новом сайте по совпадению названия и пишет пары старый путь → новый путь в CSV.

## Про newOrigin (адрес нового сайта)

- **В Docker (на VPS):** используйте `http://app:3000` — из контейнера приложение доступно по имени сервиса `app`.
- **Локально (без Docker):** укажите URL нового сайта: временный IP или стейджинг, например `https://staging.example.com` или `http://82.202.159.85`.

## Однострочники для копирования

```bash
# Только CSV в ./data/redirects.csv
docker compose run --rm -v "$(pwd)/data:/data" app npm run redirects:compare -- https://innerhealth.ru http://app:3000 --match --out /data/redirects.csv

# Импорт в БД
docker compose run --rm app npm run redirects:compare -- https://innerhealth.ru http://app:3000 --match --import-db
```
