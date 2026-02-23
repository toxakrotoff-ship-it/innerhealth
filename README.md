# Inner Health

Сайт интернет-магазина **Inner Health** ([innerhealth.ru](https://innerhealth.ru)): каталог товаров, корзина, оформление заказов, админ-панель, интеграции (YooKassa, СДЭК, Telegram-бот, Tilda).

---

## Стек

- **Frontend / Backend:** [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript
- **Стили:** Tailwind CSS 4, Radix UI, Shadcn-подобные компоненты
- **БД:** PostgreSQL, [Prisma](https://www.prisma.io/) 7 (в т.ч. `@prisma/adapter-pg`)
- **Аутентификация:** NextAuth v4 (Credentials, JWT)
- **Редактор контента:** TipTap
- **Деплой:** Docker, Nginx; опционально Let's Encrypt

---

## Структура репозитория

```
innerhealth/
├── README.md                 # этот файл
├── docs/                     # документация проекта (деплой, окружение, ТЗ, миграции)
├── nextjs-project/           # приложение Next.js
│   ├── prisma/               # схема и миграции
│   ├── scripts/              # утилиты: сиды, импорт, Telegram-бот и т.д.
│   ├── src/
│   │   ├── app/              # маршруты (site, admin, login, api)
│   │   ├── components/
│   │   └── lib/
│   └── docs/                 # доп. документация (пароль, SMTP)
└── deploy/                   # конфиги деплоя (Nginx, docker-compose и т.д.)
```

---

## Быстрый старт

### Требования

- Node.js 18+
- PostgreSQL
- (Опционально) Docker и Docker Compose — для деплоя

### Установка и запуск

```bash
cd nextjs-project
cp .env.example .env   # или скопировать из docs
# Заполнить .env (см. раздел «Документация» → переменные окружения)
npm install
npx prisma generate
npx prisma migrate deploy   # или db:push для разработки
npm run dev
```

Приложение: [http://localhost:3000](http://localhost:3000). Админка: `/admin` (или путь из `ADMIN_SECRET_PATH`).

---

## Основные скрипты (nextjs-project)

| Команда | Описание |
|--------|----------|
| `npm run dev` | Режим разработки |
| `npm run build` | Сборка для production |
| `npm run start` | Запуск production-сервера |
| `npm run db:migrate` | Применить миграции Prisma к БД |
| `npm run db:push` | Синхронизировать схему с БД без миграций |
| `npm run add-admin` | Интерактивное добавление пользователя (email, пароль, роль) |
| `npm run create-admin` | Создание первого админа |
| `npm run seed:categories` | Сид категорий |
| `npm run import-tilda-leads` | Импорт лидов из Tilda |
| `npm run telegram-bot` | Запуск Telegram-бота (уведомления, промокоды) |
| `npm run tilda:download-images` | Скачивание изображений с Tilda CDN в локальный `public` |

Полный список — в [nextjs-project/package.json](nextjs-project/package.json).

---

## Документация

Ниже — ссылки на актуальные файлы в репозитории.

### Окружение и конфигурация

- **[docs/env's.md](docs/env's.md)** — перечень переменных окружения (база, auth, YooKassa, CDEK, Telegram, SMTP и др.)
- **[nextjs-project/docs/password-reset-env.md](nextjs-project/docs/password-reset-env.md)** — сброс пароля и настройка SMTP (в т.ч. VK WorkSpace, Gmail, Яндекс, Mail.ru)

### Деплой и инфраструктура

- **[docs/deploy-vps.md](docs/deploy-vps.md)** — деплой на VPS (Ubuntu, Docker, Nginx, SSL)
- **[docs/deploy.md](docs/deploy.md)** — общее руководство по развёртыванию
- **[docs/prisma-migrations-and-deploy.md](docs/prisma-migrations-and-deploy.md)** — миграции Prisma и подготовка к деплою

### Функциональность и ТЗ

- **[docs/STATUS.md](docs/STATUS.md)** — текущий статус проекта (реализовано / в планах)
- **[docs/adminv2.md](docs/adminv2.md)** — ТЗ админки
- **[docs/tg_bot.md](docs/tg_bot.md)** — Telegram-бот: уведомления, вайтлист, промокоды
- **[docs/step_3_yokassa\|cdek.md](docs/step_3_yokassa%7Ccdek.md)** — YooKassa и СДЭК
- **[docs/tilda-leads-order-composition.md](docs/tilda-leads-order-composition.md)** — лиды и состав заказа из Tilda

### Дополнительно

- **[docs/categories.md](docs/categories.md)** — категории каталога
- **[docs/performance-optimization.md](docs/performance-optimization.md)** — оптимизация производительности
- **[docs/help_me_dockerized.md](docs/help_me_dockerized.md)** — помощь по Docker-развёртыванию

---

## Основные маршруты приложения

- **Публичная часть:** `/`, `/catalog`, `/catalog/[categorySlug]`, `/product/[slug]`, `/product/id/[id]`, `/cart`, `/news`, `/news/[slug]`, `/o-nas`, `/contacts`, `/sotrudnichestvo`, `/privacy`, `/oferta` и др.
- **Вход:** `/login`, `/login/forgot-password`, `/login/reset-password`, `/login/change-password`
- **Админка:** `/admin` (редирект на каталог), `/admin/catalog`, `/admin/catalog/categories`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`, `/admin/products/import`, `/admin/news`, `/admin/promo-codes`, `/admin/orders`, `/admin/orders-statistics`, `/admin/users`, `/admin/settings`, `/admin/profile`, `/admin/tilda-leads`, `/admin/partnership`

API: префикс `/api` (auth, admin, cart, orders, telegram и т.д.).

---

## Лицензия

Приватный репозиторий. Все права защищены.
