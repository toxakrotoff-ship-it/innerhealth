# Inner Health Platform

Платформа e-commerce для двух брендов: **Inner Health** и **Sprint Power**.

- **Один бэкенд**, **две изолированные витрины** (домены Inner и Sprint), одна админка с переключателем бренда
- Общие модули каталога, заказов и интеграций; **разведение** товаров, заказов и brand-scoped настроек
- **Объединённый ЛК** по email (сеть магазинов); вход/регистрация на **общих** URL
- Целевая модель, интеграции и чеклист расхождений с кодом: **[docs/two-storefronts-architecture.md](docs/two-storefronts-architecture.md)**

## Open Source Purpose

InnerHealth is designed as a reusable multi-brand e-commerce starter for small commerce teams. It provides brand-scoped storefronts, shared customer accounts, catalog, orders, payments, delivery integrations, admin settings, 2FA, bot automation, and migration tooling in one Next.js/Prisma/PostgreSQL codebase.

---

## Стек

- **Frontend / Backend:** [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript
- **Стили:** Tailwind CSS 4, Radix UI, Shadcn-подобные компоненты
- **БД:** PostgreSQL, [Prisma](https://www.prisma.io/) 7 (в т.ч. `@prisma/adapter-pg`)
- **Аутентификация:** NextAuth **v4** (Credentials, JWT), 2FA (TOTP и email-коды); переход на v5 — в roadmap (см. [docs/plans/2026-02-24-2fa.md](docs/plans/2026-02-24-2fa.md))
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

- Node.js 22 (LTS)
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

Витрина бренда определяется по `host`, `x-brand` и brand-cookie. В админке активный бренд выбирается встроенным switcher и влияет на brand-scoped данные и настройки.

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
- **[nextjs-project/docs/2fa-env.md](nextjs-project/docs/2fa-env.md)** — переменные для 2FA (TOTP, email-коды)
- **[nextjs-project/docs/yandex-maps-env.md](nextjs-project/docs/yandex-maps-env.md)** — Яндекс.Карты (ключ, CSP)

### Деплой и инфраструктура

- **[docs/deploy-vps.md](docs/deploy-vps.md)** — деплой на VPS (Ubuntu, Docker, Nginx, SSL)
- **[docs/deploy.md](docs/deploy.md)** — общее руководство по развёртыванию
- **[docs/prisma-migrations-and-deploy.md](docs/prisma-migrations-and-deploy.md)** — миграции Prisma и подготовка к деплою

### Функциональность и ТЗ

- **[docs/two-storefronts-architecture.md](docs/two-storefronts-architecture.md)** — целевая архитектура двух витрин (учётки, заказы, ЮKassa, СДЭК, боты, отчёты)
- **[docs/STATUS.md](docs/STATUS.md)** — текущий статус проекта (реализовано / в планах)
- **[docs/adminv2.md](docs/adminv2.md)** — ТЗ админки
- **[docs/tg_bot.md](docs/tg_bot.md)** — Telegram-бот: уведомления, вайтлист, промокоды
- **[docs/step_3_yokassa|cdek.md](docs/step_3_yokassa%7Ccdek.md)** — YooKassa и СДЭК
- **[docs/tilda-leads-order-composition.md](docs/tilda-leads-order-composition.md)** — лиды и состав заказа из Tilda

### Планы и roadmap

- **[docs/plans/](docs/plans/)** — планы доработок (2FA, СДЭК, ЛК пользователя, партнёры, roadmap)
- **[docs/plans/2026-05-04-second-brand-completion-plan.md](docs/plans/2026-05-04-second-brand-completion-plan.md)** — план доведения второго бренда (Sprint Power) до целевой модели
- **[docs/plans/PROJECT-INDEX.md](docs/plans/PROJECT-INDEX.md)** — полный индекс проекта и навигация по коду
- **[docs/plans/2026-02-24-2fa.md](docs/plans/2026-02-24-2fa.md)** — план внедрения 2FA (реализовано)
- **[docs/plans/2026-02-28-partner-lk-implementation.md](docs/plans/2026-02-28-partner-lk-implementation.md)** — ЛК партнёра и управление партнёрами
- **[docs/LK-users.md](docs/LK-users.md)** — ЛК пользователя (профиль, заказы, адреса)

### Дополнительно

- **[docs/categories.md](docs/categories.md)** — категории каталога
- **[docs/performance-optimization.md](docs/performance-optimization.md)** — оптимизация производительности
- **[nextjs-project/docs/plans/2026-03-18-product-photo-normalization-design.md](nextjs-project/docs/plans/2026-03-18-product-photo-normalization-design.md)** — нормализация URL фото товаров (каталог, карточка, админка)

---

## Основные маршруты приложения

- **Публичная часть:** `/`, `/catalog`, `/catalog/[categorySlug]`, `/product/[slug]`, `/product/id/[id]`, `/cart`, `/news`, `/news/[slug]`, `/o-nas`, `/contacts`, `/sotrudnichestvo`, `/privacy`, `/oferta` и др.
- **ЛК пользователя:** `/account` (профиль), `/account/orders`, `/account/orders/[id]`, `/account/addresses`, `/account/verify-email`; для партнёров — `/account/partner` (промокоды, статистика, доход).
- **Вход:** `/login`, `/login/2fa`, `/login/forgot-password`, `/login/reset-password`, `/login/change-password`, `/login/set-initial-password`
- **Админка:** `/admin` (редирект на каталог), `/admin/catalog`, `/admin/catalog/categories`, `/admin/products`, `/admin/products/new`, `/admin/products/[id]/edit`, `/admin/products/import`, `/admin/news`, `/admin/promo-codes`, `/admin/orders`, `/admin/orders-statistics`, `/admin/users`, `/admin/partners`, `/admin/partners/[userId]`, `/admin/settings`, `/admin/profile`, `/admin/tilda-leads`, `/admin/partnership`, `/admin/faq`, `/admin/quick-orders`, `/admin/redirects`, `/admin/site-popup`, `/admin/gift-promotions`, `/admin/leads-export`, `/admin/content` и др. (полный список — вывод `next build` или `docs/plans/PROJECT-INDEX.md`)

API: префикс `/api` (auth, admin, cart, orders, telegram, partners и т.д.).

---

## 📄 Лицензия

InnerHealth is open-source software licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.
