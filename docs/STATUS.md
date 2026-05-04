# Статус проекта InnerHealth.ru (по ТЗ adminv2.md)

**Дата обновления:** 04.05.2026  
**Реализовано:** админка (каталог, товары, категории, новости, промокоды, заказы, пользователи, **партнёры**, настройки, модерация отзывов, FAQ, быстрые заявки, редиректы, Telegram), публичная часть (главная, каталог, карточка товара, корзина, новости, отзывы), **ЛК пользователя** (профиль, заказы, адреса, верификация email), **ЛК партнёра** (промокоды, статистика, доход), **2FA** (TOTP и email-коды), **ЮKassa и СДЭК (API)**, **нормализация URL фото товаров** для каталога и карточек (см. `nextjs-project/src/lib/product-photo-normalization.ts` и [дизайн-док](../nextjs-project/docs/plans/2026-03-18-product-photo-normalization-design.md)).

Дополнительно: проект доведён до схемы **2 storefronts / 1 admin** на уровне платформы. В коде заведены бренды `inner` и `sprint-power`, storefront определяет бренд по host/header/cookie, в админке есть переключатель бренда, а brand-scope применяется к настройкам, контент-блокам, категориям, лидам, редиректам и popup на главной.

**Целевая модель «конец проекта»** (согласованные решения по продукту): один бэкенд, две изолированные витрины; смешанной корзины нет; ЮKassa — **разные shopId** по брендам; СДЭК — **отдельные учётные данные и отправитель по бренду** в админке (с fallback на глобальные настройки), отгрузка по `order.brand`; боты — **разные** на бренд; отчёты в основном по бренду + отдельная выгрузка «с обеих витрин»; единый ЛК и общие страницы входа/регистрации. Подробно и чеклист пробелов с кодом: **[two-storefronts-architecture.md](./two-storefronts-architecture.md)**.

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
- **NextAuth** (v4) — Credentials, JWT, страницы `/login`, сброс пароля (forgot/reset), **завершение регистрации нового пользователя** (ссылка из письма → код на почту → установка пароля на `/login/set-initial-password`). **2FA реализовано:** TOTP и email-коды, страница `/login/2fa`, API `/api/auth/2fa/setup`, `/api/auth/2fa/send-code`, `/api/auth/verify-2fa`; настройка в админке (Профиль / Настройки).
- **Edge (Next.js 16)** — `src/proxy.ts`: в этой версии фреймворка edge-логика задаётся файлом `proxy` (не добавляйте отдельный `middleware.ts` рядом — будет конфликт). `withAuth` в production, упрощённый handler в development; защита админки и `/api/admin`; `ADMIN_SECRET_PATH` и rewrite на `/admin`; CSP и редиректы из БД. Ссылки админки — `adminBasePath` (`AdminBasePathProvider`). Matcher — `export const config` в `proxy.ts`.

### Админка
- **Layout** — сайдбар, хедер, ProfileMenu, навигация (порядок пунктов):
  - Профиль
  - Каталог товаров
  - Модерация отзывов
  - FAQ
  - Категории
  - Новости / Статьи (фильтр по `type`)
  - Промокоды
  - Заказы (CRM)
  - Быстрые заявки
  - Заявки с Тильды
  - Сотрудничество
  - Статистика заказов
  - Пользователи
  - Партнёры
  - Редиректы
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
- **Tilda-лиды** (`/admin/tilda-leads`) — просмотр лидов. **Партнёрство** (`/admin/partnership`) — заявки партнёров. **Партнёры** (`/admin/partners`, `/admin/partners/[userId]`) — управление партнёрами (роль PARTNER), привязка промокодов с процентом дохода, просмотр статистики. **FAQ** (`/admin/faq`), **Быстрые заявки** (`/admin/quick-orders`), **Редиректы** (`/admin/redirects`).
- **UI** — компоненты в стиле Shadcn (Button, Input, Textarea и др.), таблицы, формы.

### Публичная часть
- Маршруты (группа `(site)`): главная (`/`), каталог (`/catalog`, `/catalog/[categorySlug]`), карточка товара (`/product/[slug]`, `/product/id/[id]`), корзина (`/cart`), новости (`/news`, `/news/[slug]`), **отзывы** (`/otzyvy` — только одобренные), «О нас» (`/o-nas`), «Контакты» (`/contacts`), «Сотрудничество» (`/sotrudnichestvo`), «Информация» (`/informaciya`), «Отзывы»/«Политика» (`/privacy`), «Оферта» (`/oferta`), «Сертификаты» (`/sertifikaty-sootvetstviya`). Cookie consent, корзина (drawer).
- **ЛК пользователя** (`/account`) — профиль, заказы (`/account/orders`, `/account/orders/[id]`), адреса доставки (`/account/addresses`), верификация email (`/account/verify-email`). Для партнёров (роль PARTNER) — раздел **ЛК партнёра** (`/account/partner`): промокоды, статистика заказов и доход по комиссии.
- **Корзина и оформление заказа с промокодами:** расчёт скидок по правилам (Rule: скидка применяется только к товарам с `isPromoEligible`, не к «уже по акции»; при заданном `discountPrice` подставляется эта цена за единицу), привязка промокода к заказу, отображение скидки и итога с доставкой. Промокод не влияет на расчёт СДЭК: стоимость доставки считается по составу корзины (вес/габариты) и направлению.

### ЮKassa и СДЭК (реализовано)
- **ЮKassa:** создание платежа при оформлении заказа (POST `/api/orders`), чек 54-ФЗ, return_url, webhook `/api/webhooks/yookassa` (payment.succeeded / payment.canceled). Учётные данные и НДС — из админки (Настройки) или env. Подробнее: [step_3_yokassa|cdek.md](./step_3_yokassa%7Ccdek.md).
- **СДЭК:** OAuth, города (GET `/api/cdek/cities`), ПВЗ (GET `/api/cdek/deliverypoints`), калькулятор тарифов (POST `/api/cdek/calculator`). Габариты товара (weight, length, width, height) в форме товара; при отсутствии — дефолты в `src/lib/cdek.ts`.

### БД (Prisma)
- **Модели:** Product (в т.ч. `photos` Json, `seoTitle`/`seoDescr`/`seoKeywords`, габариты weight/length/width/height, `discountPrice`, `isPromoEligible`), Category, ProductCategory, User (роли USER, WRITER, ADMIN, **PARTNER**; связи orders, addresses, emailVerificationTokens), Order, OrderItem, CartItem, ShippingInfo, Post, PromoCode, **PartnerPromoCode** (связь партнёр–промокод, commissionPercent), Review (authorName, socialLink, text, imageUrl, status: PENDING | APPROVED | REJECTED), TildaLead, PartnershipLead, **UserAddress**, **EmailVerificationToken**, SiteSetting, TelegramWhitelist, TelegramLinkCode (одноразовые коды привязки), PasswordResetToken, SetInitialPasswordToken (завершение регистрации: токен ссылки + 6-значный код), **TwoFactorPending**, **TwoFactorGrant** (2FA).
- **Схема:** `nextjs-project/prisma/schema.prisma`. **Миграции:** `nextjs-project/prisma/migrations/` (init, product_category, promo_code, must_change_password, partnership_lead, tilda_lead, yookassa_payment_id, site_setting, product slug/tab_titles, product_photos, user_profile_columns, review_table, review_status_moderation, set_initial_password_token, add_product_promo_fields, **add_2fa_tables**, **add_lk_users_models**, **add_partner_role_and_partner_promo**, redirect, category_parent, faq_quick_order и др.).

### Telegram-бот
- Отдельный процесс (`npm run telegram-bot`), long polling. Подключение админов по коду из профиля, вайтлист, API для подтверждения и статистики по промокодам. В деплое — сервис в docker-compose. Документация: [tg_bot.md](./tg_bot.md).

---

## Что в админке не доделано (по ТЗ)

1. **NextAuth v5**  
   ТЗ: переход на NextAuth v5. Сейчас используется NextAuth v4. 2FA (TOTP и email-коды) реализовано.

---

## Что не начато или в заделе (по ТЗ и roadmap)

- **Matcher middleware** — в `src/proxy.ts` matcher задан массивом с жёстко `/admin/:path*` и общим `/:segment/:path*`. Рекомендация (см. plans): сделать matcher явно зависящим от `ADMIN_SECRET_PATH`, чтобы при смене переменной защищался один и тот же префикс. По желанию: переход на NextAuth v5, виджет выбора ПВЗ СДЭК на корзине, авто-создание заказа в ЛК СДЭК при статусе PAID.
- **Две витрины — целевые доработки** (см. [two-storefronts-architecture.md](./two-storefronts-architecture.md)): **сделано:** поле `Order.brand` + бэкфил ([order-brand-phase-0-snapshot.md](./backend-notes/order-brand-phase-0-snapshot.md)); регистрация при занятом email — API `EMAIL_ALREADY_REGISTERED`, блок на `/register` и переход на `/login?email=`; **юр. тексты** `/privacy` и `/oferta` — контент-блоки `legal-privacy` / `legal-oferta` (rich) с fallback на код до заполнения ([storefront-copy-ownership.md](./backend-notes/storefront-copy-ownership.md)). **ЛК:** витрина заказа по `Order.brand`. **Лиды:** выгрузка «все витрины» (`/admin/leads-export`, `?allBrands=1`). **Дальше:** по желанию — остальные статические страницы в тот же паттерн.

---

## Рекомендации по приоритету

1. **Matcher middleware** — сделать зависимым от `ADMIN_SECRET_PATH` (или вынести защищаемый префикс в один конфиг), чтобы при смене переменной защищался нужный путь.
2. Далее по желанию: переход на NextAuth v5, доработки СДЭК (виджет ПВЗ, заказ в ЛК).

---

## Связанные документы

| Документ | Описание |
|---------|----------|
| [two-storefronts-architecture.md](./two-storefronts-architecture.md) | Целевая архитектура 2 витрин / 1 бэк (учётки, платежи, отчёты) |
| [plans/2026-05-04-second-brand-completion-plan.md](./plans/2026-05-04-second-brand-completion-plan.md) | План работ: довести второй бренд до целевой модели |
| [adminv2.md](./adminv2.md) | Техническое задание, стек, roadmap |
| [step_3_yokassa\|cdek.md](./step_3_yokassa%7Ccdek.md) | Настройка ЮKassa и СДЭК |
| [categories.md](./categories.md) | Категории и разделы каталога |
| [tg_bot.md](./tg_bot.md) | Telegram-бот |
| [LK-users.md](./LK-users.md) | ЛК пользователя (профиль, заказы, адреса, верификация email) |
| [plans/](./plans/) | Планы доработок (2FA, СДЭК, roadmap, DAL, партнёры) |
| [plans/PROJECT-INDEX.md](./plans/PROJECT-INDEX.md) | Полный индекс проекта и навигация по коду |
| [plans/2026-02-24-2fa.md](./plans/2026-02-24-2fa.md) | План внедрения 2FA (реализовано: TOTP, email-коды) |
| [plans/2026-02-28-partner-lk-implementation.md](./plans/2026-02-28-partner-lk-implementation.md) | ЛК партнёра и управление партнёрами в админке |
| [plans/2026-02-26-user-branch-security-hardening-implementation.md](./plans/2026-02-26-user-branch-security-hardening-implementation.md) | Ужесточение безопасности ветки пользователей |
