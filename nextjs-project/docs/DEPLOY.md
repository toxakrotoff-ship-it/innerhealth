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
   - `NEXT_PUBLIC_SITE_URL` — то же для sitemap, robots, писем, RSS
   - `NEXT_PUBLIC_YANDEX_VERIFICATION` — (опционально) код верификации из Яндекс.Вебмастера для мета-тега `yandex-verification`
   - `ADMIN_SECRET_PATH` — секретный путь к админке (по умолчанию `admin-panel`)
   - `SETTINGS_ENCRYPTION_KEY` — ключ шифрования настроек в БД

Остальные переменные описаны в `.env.example`.

### Яндекс и ленты

- В **Яндекс.Вебмастере** укажите **регион** сайта (Москва / Россия — по факту работы магазина).
- Один канонический домен: **`NEXT_PUBLIC_SITE_URL`** и **`NEXTAUTH_URL`** должны совпадать с тем, что открывают пользователи (без смеси www / non-www).
- Добавьте ленту **`https://<ваш-домен>/rss.xml`** (новости и статьи из БД, обновление до 10 минут).
- Для подтверждения прав на сайт задайте `NEXT_PUBLIC_YANDEX_VERIFICATION` и пересоберите проект.
- Для целей Метрики (например, пустой поиск в каталоге) задайте **`NEXT_PUBLIC_YM_COUNTER_ID`** и создайте цель с идентификатором **`catalog_search_zero`** в интерфейсе Метрики.

### SEO-хабы

- В админке: **SEO хабы** — страницы вида **`/guides/<slug>`** с текстом (JSON TipTap) и привязкой товаров по slug.
- После публикации URL попадает в **sitemap** и блок «Подборки» на **`/informaciya`**.

### Пустой поиск в каталоге

- События пишутся в таблицу **`CatalogSearchZeroHit`** (API `POST /api/catalog/zero-hit`). Опционально задайте **`ZERO_HIT_RATE_SALT`** для учёта по хешу IP.

### Индексация каталога (фильтры / пагинация)

Через `generateMetadata` для **`/catalog`** выставляется **`noindex`** (с **`follow`**) для «тонких» URL, чтобы не раздувать индекс:

- страница **`page` &gt; 5**;
- поиск **`q`** без результатов;
- выбрано **два и более бренда** в фильтре.

Логика в **`src/lib/catalog-listing-robots.ts`** — при необходимости ослабьте или ужесточите пороги.

### Core Web Vitals (кратко)

- **LCP:** герой и первая карточка каталога используют `priority` / `fetchPriority` где уместно; крупные блоки ниже сгиба — через `dynamic` (см. главную).
- **CLS:** у баннеров и медиа заданы **`min-height`** или **`aspect-*`** (например галерея товара, бегущая строка Sprint Power).
- **INP:** тяжёлые секции не должны блокировать главный поток; при росте интерактива профилируйте в Chrome Performance / отчёте CrUX.

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

Сервер Next.js делает `process.chdir` в каталог `.next/standalone`, поэтому **клиентские чанки** (`/_next/static/...`) и файлы из **`public/`** (например `/images/...`) должны быть доступны относительно этого каталога: `.next/standalone/.next/static` и `.next/standalone/public`. В **`Dockerfile`** это дублируется явным `COPY` из артефактов сборки. Дополнительно в корне образа остаются `/app/public` и `/app/.next/static` для совместимости и скриптов.

Пути к `public/uploads` в коде API разрешаются через **`getProjectRoot()`** (`src/lib/project-root.ts`), чтобы при `cwd === .next/standalone` запись шла в реальный `/app/public/uploads` (совпадает с volume в `docker-compose`).

См. также [Next.js Docker standalone](https://github.com/vercel/next.js/tree/canary/examples/with-docker).

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

### «Server Action … was not found» после Cmd+Shift+R

Жёсткая перезагрузка сбрасывает кэш **браузера**, но не устраняет:

- **Rolling deploy:** HTML и JS с одной версии, а следующий POST Server Action попадает на инстанс со **старой** сборкой (или наоборот). Нужны **один билд на всех нодах**, одинаковые **`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`** и **`DEPLOYMENT_VERSION`**, либо деплой без одновременной работы разных версий (blue-green).
- **Кэш прокси/CDN на HTML или на `/_next/*`:** отключите кэширование ответов для путей админки. В `next.config.ts` для префикса админки (переменная **`ADMIN_SECRET_PATH`**, по умолчанию **`admin`**) выставляется **`Cache-Control: private, no-store`**; на nginx/Caddy не переопределяйте это на `public`/долгий `max-age`.
- **Реальная причина digest в проде** смотрится в **логах сервера** в момент запроса (в браузере текст обрезан).

## Обратный прокси (nginx)

Рекомендуется держать Next.js за reverse proxy (nginx, Caddy и т.п.) для ограничения размера тела запроса, rate limiting и TLS. Для стриминга отключите буферизацию, например в nginx:

```nginx
proxy_set_header X-Accel-Buffering no;
```

### Multi-brand domains (one app, multiple hosts)

For host-based brand routing (e.g. `inner...` + `sprintpower...`) point all domains to one VPS IP and include all of them in TLS cert:

```bash
export CERT_DOMAINS="innerhealth.ru sprintpower.inetrnet.pp.ru"
export CERT_EMAIL="you@example.com"
./deploy/deploy.sh
```

Nginx must forward `Host` and `X-Forwarded-Host` so the app can resolve brand by incoming domain.

Для плашки VPN nginx **обязательно** должен передавать реальный IP клиента (уже настроено в `deploy/nginx/conf.d/default.conf`):

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Без этих заголовков GeoIP в приложении не сможет определить страну.

## Плашка «Выключите VPN» (GeoIP)

Плашка показывается посетителям с IP **вне России** (`country !== RU`). Страна определяется в Next.js через пакет **`geoip-lite`** (база внутри npm-зависимости). Отдельные ключи MaxMind, скачивание `.mmdb` и настройка GeoIP в nginx **не нужны**.

### Переменные окружения

| Переменная | По умолчанию | Назначение |
|------------|--------------|------------|
| `VPN_NOTICE_ENABLED` | включено | `false` / `0` / `off` — полностью отключить плашку |
| `VPN_NOTICE_DEV_COUNTRY` | — | Только dev на `localhost`: принудительная страна, напр. `US` |

В `.env` на VPS обычно ничего добавлять не нужно — плашка включена после деплоя.

Чтобы отключить:

```env
VPN_NOTICE_ENABLED=false
```

### Деплой на VPS (Docker)

Из каталога `nextjs-project` на сервере:

```bash
# Обычное обновление (код уже в git, миграции, пересборка app)
./deploy/deploy-quick.sh
```

Скрипт сам:

1. делает `git pull`;
2. собирает образ `app` (в него попадает `geoip-lite`);
3. применяет миграции Prisma;
4. перезапускает `app`, ботов и nginx.

Первый деплой или полная переустановка:

```bash
./deploy/deploy.sh
```

Проверка перед выкладкой с локальной машины (без Docker):

```bash
npm run deploy:check
```

### Проверка после деплоя

1. **С российского IP** (без VPN) — плашки быть не должно.
2. **С VPN на зарубежный выход** — жёлтая полоса вверху: «Для стабильной работы сайта выключите VPN».
3. Кнопка **✕** скрывает плашку; выбор запоминается в `localStorage` (`vpn-notice-dismissed`) в этом браузере.

Проверка логики GeoIP на сервере (в контейнере app):

```bash
docker compose exec app node -e "const g=require('geoip-lite'); console.log(g.lookup('8.8.8.8'));"
# ожидается country: 'US'

docker compose exec app node -e "const g=require('geoip-lite'); console.log(g.lookup('87.250.250.242'));"
# ожидается country: 'RU'
```

### Локальная разработка

В `.env.local`:

```env
VPN_NOTICE_DEV_COUNTRY=US
```

Запуск:

```bash
npm run dev
```

На `localhost` плашка появится без VPN. На продакшене `VPN_NOTICE_DEV_COUNTRY` игнорируется.

### Ограничения

- Определяется **страна IP**, а не факт VPN: выход в РФ — плашки нет; пользователь за рубежом без VPN — плашка есть.
- Точность GeoIP ~95–99%; возможны редкие ошибки у мобильных и корпоративных сетей.
- База `geoip-lite` обновляется при `npm update geoip-lite` и пересборке образа `app`.
- Внутренние IP (`10.x`, `172.16–31.x`, `192.168.x`) не мапятся — плашка не показывается.

### Если плашка не появляется у пользователя с VPN

1. Убедитесь, что VPN выдаёт **не российский** exit IP.
2. Проверьте, что nginx передаёт `X-Forwarded-For` / `X-Real-IP` (см. выше).
3. Убедитесь, что в `.env` нет `VPN_NOTICE_ENABLED=false`.
4. Пользователь мог закрыть плашку ранее — очистить `localStorage` для домена или проверить в режиме инкогнито.

## Если в dev появляются ошибки

- **«Persisting failed» / SST (Turbopack):** удалите `.next` и снова запустите `npm run dev`, либо используйте `npm run dev:webpack`.
- **ENOENT манифестов (routes-manifest и т.д.):** не используйте обёртки вокруг `next dev`; запускайте `npm run dev` или `npm run dev:webpack`. При необходимости очищайте `.next` и перезапускайте.
