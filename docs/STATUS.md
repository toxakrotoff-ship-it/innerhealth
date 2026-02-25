# Статус проекта InnerHealth.ru (по ТЗ adminv2.md)

**Дата обновления:** 24.02.2026  
**Реализовано:** админка (каталог, товары, категории, новости, промокоды, заказы, пользователи, настройки, модерация отзывов, Telegram), публичная часть (главная, каталог, карточка товара, корзина, новости, отзывы), **ЮKassa и СДЭК (API)**. В планах: NextAuth v5 + 2FA.

---

## Структура проекта

- **Приложение:** `nextjs-project/` (Next.js App Router, React, TypeScript).
- **БД и миграции:** `nextjs-project/prisma/` (schema.prisma, migrations/).
- **Документация:** `docs/` (в т.ч. adminv2.md, STATUS.md, планы в docs/plans/).

---

## Что сделано

### Инфраструктура
- **Next.js** (App Router), **PostgreSQL**, **Prisma** — подключены. Синглтон Prisma в `src/lib/prisma.ts`.
- **Tailwind CSS** — настроен. **Шрифт Montserrat** подключён в корневом `layout.tsx` через `next/font/google` (переменная `--font-montserrat`, `font-sans` на `body`).
- **NextAuth** (v4) — Credentials, JWT, страницы `/login`, сброс пароля (forgot/reset), **завершение регистрации нового пользователя** (ссылка из письма → код на почту → установка пароля на `/login/set-initial-password`). 2FA нет.
- **Middleware** — в `src/proxy.ts`: withAuth, проверка авторизации для путей админки и `/api/admin`; учёт `ADMIN_SECRET_PATH` в `authorized`; при кастомном пути — rewrite на `/admin`; все ссылки админки строятся от `adminBasePath` (контекст `AdminBasePathProvider` из layout). Matcher: `/admin/:path*`, `/api/admin/:path*`, `/api/orders`, `/api/promo/:path*`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/:segment/:path*`.

### Админка
- **Layout** — сайдбар, хедер, ProfileMenu, навигация (порядок пунктов):
  - Профиль
  - Каталог товаров
  - Модерация отзывов
  - Категории
  - Новости / Статьи (фильтр по `type`)
  - Промокоды
  - Заказы (CRM)
  - Заявки с Тильды
  - Сотрудничество
  - Статистика заказов
  - Пользователи
  - Настройки сайта
- **Каталог** (`/admin/catalog`) — список товаров (таблица), поиск, сортировка, фильтр по категории (CategorySidebar). Кнопки «Ред.» и «Удалить» — переход на `/admin/products/[id]/edit` и вызов API удаления с обновлением списка.
- **Товары:** создание/редактирование (`/admin/products/new`, `/admin/products/[id]/edit`), форма с полями схемы (табы tab1–tab4, заголовки табов, габариты для СДЭК, **блок SEO** — `seoTitle`, `seoDescr`, `seoKeywords`, **галерея изображений с D&D**). TipTap (RichTextEditor) для полей описание, основной текст и содержимое табов. В таблице каталога — **инлайн-редактирование цены и остатка** (двойной клик, PATCH). Просмотр товара `/admin/products/[id]` с кнопкой «Редактировать». **Импорт из CSV** (`/admin/products/import`): tildaUid, title, description, text, price, quantity, priceOld, photo, category, SEO, табы, характеристики; поиск по `tildaUid`, скачивание фото в `public/uploads/products/`.
- **Категории** (`/admin/catalog/categories`) — полный CRUD (список, создание, редактирование, удаление).
- **Новости** — список, создание, редактирование (Post). TipTap для контента, загрузка медиа. Разделение Новости / Статьи по типу.
- **Промокоды** — страница и API: создание, редактирование, удаление, вкл/выкл (активен/неактивен).
- **Заказы** — список заказов (CRM), раскрытие состава; **Статистика заказов** — отдельная страница.
- **Пользователи** — управление: при создании на email отправляется **ссылка для завершения регистрации** (пароль в письме не передаётся; пользователь переходит по ссылке, получает 6-значный код на почту и задаёт пароль на `/login/set-initial-password`). Кнопка **«Удалить»** с подтверждением (DELETE); удаление своего аккаунта запрещено.
- **Настройки** — настройки сайта, почтовые ящики, **ЮKassa**, **СДЭК**, Telegram администраторов.
- **Профиль** — редактирование профиля; блок «Уведомления Telegram»: генерация одноразового кода, ссылка на бота для привязки (вайтлист).
- **Модерация отзывов** (`/admin/reviews`) — список отзывов, фильтр по статусу (все / на модерации / опубликованы / отклонённые), одобрение/отклонение. На сайте отображаются только отзывы со статусом APPROVED.
- **Tilda-лиды** (`/admin/tilda-leads`) — просмотр лидов. **Партнёрство** (`/admin/partnership`) — заявки партнёров.
- **UI** — компоненты в стиле Shadcn (Button, Input, Textarea и др.), таблицы, формы.

### Публичная часть
- Маршруты (группа `(site)`): главная (`/`), каталог (`/catalog`, `/catalog/[categorySlug]`), карточка товара (`/product/[slug]`, `/product/id/[id]`), корзина (`/cart`), новости (`/news`, `/news/[slug]`), **отзывы** (`/otzyvy` — только одобренные), «О нас» (`/o-nas`), «Контакты» (`/contacts`), «Сотрудничество» (`/sotrudnichestvo`), «Информация» (`/informaciya`), «Отзывы»/«Политика» (`/privacy`), «Оферта» (`/oferta`), «Сертификаты» (`/sertifikaty-sootvetstviya`). Cookie consent, корзина (drawer).
- **Корзина и оформление заказа с промокодами:** расчёт скидок по правилам (Rule: скидка применяется только к товарам с `isPromoEligible`, не к «уже по акции»; при заданном `discountPrice` подставляется эта цена за единицу), привязка промокода к заказу, отображение скидки и итога с доставкой. Промокод не влияет на расчёт СДЭК: стоимость доставки считается по составу корзины (вес/габариты) и направлению.

### ЮKassa и СДЭК (реализовано)
- **ЮKassa:** создание платежа при оформлении заказа (POST `/api/orders`), чек 54-ФЗ, return_url, webhook `/api/webhooks/yookassa` (payment.succeeded / payment.canceled). Учётные данные и НДС — из админки (Настройки) или env. Подробнее: [step_3_yokassa|cdek.md](./step_3_yokassa%7Ccdek.md).
- **СДЭК:** OAuth, города (GET `/api/cdek/cities`), ПВЗ (GET `/api/cdek/deliverypoints`), калькулятор тарифов (POST `/api/cdek/calculator`). Габариты товара (weight, length, width, height) в форме товара; при отсутствии — дефолты в `src/lib/cdek.ts`.

### БД (Prisma)
- **Модели:** Product (в т.ч. `photos` Json, `seoTitle`/`seoDescr`/`seoKeywords`, габариты weight/length/width/height, `discountPrice`, `isPromoEligible`), Category, ProductCategory, User, Order, OrderItem, CartItem, ShippingInfo, Post, PromoCode, Review (authorName, socialLink, text, imageUrl, status: PENDING | APPROVED | REJECTED), TildaLead, PartnershipLead, SiteSetting, TelegramWhitelist, TelegramLinkCode (одноразовые коды привязки), PasswordResetToken, SetInitialPasswordToken (завершение регистрации: токен ссылки + 6-значный код).
- **Схема:** `nextjs-project/prisma/schema.prisma`. **Миграции:** `nextjs-project/prisma/migrations/` (init, product_category, promo_code, must_change_password, partnership_lead, tilda_lead, yookassa_payment_id, site_setting, product slug/tab_titles, product_photos, user_profile_columns, review_table, review_status_moderation, set_initial_password_token, add_product_promo_fields).

### Telegram-бот
- Отдельный процесс (`npm run telegram-bot`), long polling. Подключение админов по коду из профиля, вайтлист, API для подтверждения и статистики по промокодам. В деплое — сервис в docker-compose. Документация: [tg_bot.md](./tg_bot.md).

---

## Что в админке не доделано (по ТЗ)

1. **NextAuth v5 и 2FA**  
   ТЗ: NextAuth v5 + 2FA. Сейчас NextAuth v4, 2FA нет.

---

## Что не начато или в заделе (по ТЗ и roadmap)

- **Matcher middleware** — в `src/proxy.ts` matcher задан массивом с жёстко `/admin/:path*` и общим `/:segment/:path*`. Рекомендация (см. plans): сделать matcher явно зависящим от `ADMIN_SECRET_PATH`, чтобы при смене переменной защищался один и тот же префикс. Остальное по желанию: NextAuth v5 и 2FA, виджет выбора ПВЗ СДЭК на корзине, авто-создание заказа в ЛК СДЭК при статусе PAID.

---

## Рекомендации по приоритету

1. **Matcher middleware** — сделать зависимым от `ADMIN_SECRET_PATH` (или вынести защищаемый префикс в один конфиг), чтобы при смене переменной защищался нужный путь.
2. Далее по желанию: NextAuth v5 и 2FA, доработки СДЭК (виджет ПВЗ, заказ в ЛК).

---

## Связанные документы

| Документ | Описание |
|---------|----------|
| [adminv2.md](./adminv2.md) | Техническое задание, стек, roadmap |
| [step_3_yokassa\|cdek.md](./step_3_yokassa%7Ccdek.md) | Настройка ЮKassa и СДЭК |
| [categories.md](./categories.md) | Категории и разделы каталога |
| [tg_bot.md](./tg_bot.md) | Telegram-бот |
| [plans/](./plans/) | Планы (roadmap batch, новый пользователь и др.) |
