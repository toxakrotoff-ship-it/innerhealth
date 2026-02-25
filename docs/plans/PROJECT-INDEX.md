# Полный индекс проекта Inner Health

Документ для проработки ТЗ и навигации по кодовой базе. Обновляется по мере изменений.

---

## 1. Корневая структура репозитория

```
innerhealth/
├── nextjs-project/     # основное Next.js приложение (вся логика, Prisma, API)
├── docs/               # документация
├── docs/plans/         # ТЗ и планы (2fa, cdek, roadmap и т.д.)
├── prisma/             # (legacy?) отдельная схема в корне
├── tests/              # e2e (example.spec.ts)
├── plans/              # планы (animation, auth, catalog, admin и т.д.)
├── package.json
├── tailwind.config.ts
├── README.md
├── .env.local
└── playwright.config.ts
```

**Рабочая директория приложения:** `nextjs-project/`

---

## 2. Next.js приложение (nextjs-project/)

### 2.1 Конфигурация

| Файл | Назначение |
|------|------------|
| `package.json` | next 16, react 19, next-auth 4, prisma 7, otplib, bcrypt, zod, nodemailer, zustand, @dnd-kit, tiptap, tailwind 4 |
| `next.config.ts` | Конфиг Next.js |
| `tsconfig.json` | TypeScript |
| `prisma.config.ts` | Конфиг Prisma |
| `Dockerfile`, `docker-compose.yml` | Деплой |
| `.env.local` | Локальные переменные (не в git) |

### 2.2 Скрипты (scripts/)

| Скрипт | Описание |
|--------|----------|
| `create-admin-user.ts` | Создание админа |
| `add-admin-user.ts` | Добавление админа |
| `manage-users.ts` | Управление пользователями |
| `seed-categories.ts` | Сид категорий |
| `import-tilda-leads.ts` | Импорт лидов из Тильды |
| `telegram-bot.ts` | Telegram-бот |
| `migrate-add-user-role.ts` | Миграция ролей |
| `backfill-product-slug.ts` | Заполнение slug товаров |
| `backfill-product-text-sanitize.ts` | Санитизация текста товаров |
| `backfill-product-dimensions-from-csv.ts` | Размеры товаров из CSV |
| `sync-product-photos-from-tilda.ts` | Синхронизация фото с Тильды |
| `download-tildacdn-images-to-local.ts` | Скачивание изображений Тильды |
| `fix-migration-history.ts` | Исправление истории миграций |
| `mark-migrations-applied.ts` | Отметка миграций как применённых |
| `generate-favicon.mjs` | Генерация favicon |

---

## 3. Исходный код (nextjs-project/src/)

### 3.1 Layouts

| Путь | Назначение |
|------|------------|
| `app/layout.tsx` | Корневой layout (шрифты, метаданные) |
| `app/(site)/layout.tsx` | Публичный сайт: Header, Footer, CartDrawer, CookieConsent; `dynamic = 'force-dynamic'`, revalidate 60 |
| `app/admin/layout.tsx` | Защищённый админ: `getServerSession(authOptions)`; редирект на `/login` без сессии, на `/login/change-password` при `mustChangePassword`; базовый путь из `ADMIN_SECRET_PATH` или `'admin'` |
| `app/login/layout.tsx` | Обёртка страниц входа (метаданные) |

**Middleware:** в `src/` отдельного `middleware.ts` нет; защита маршрутов в layout'ах и в API через `getServerSession`.

### 3.2 Страницы приложения (App Router)

#### Публичные (site)

| Маршрут | Файл |
|---------|------|
| `/` | `app/(site)/page.tsx` |
| `/catalog` | `app/(site)/catalog/page.tsx` |
| `/catalog/[categorySlug]` | `app/(site)/catalog/[categorySlug]/page.tsx` |
| `/product/[slug]` | `app/(site)/product/[slug]/page.tsx` |
| `/product/id/[id]` | `app/(site)/product/id/[id]/page.tsx` |
| `/cart` | `app/(site)/cart/page.tsx` |
| `/news` | `app/(site)/news/page.tsx` |
| `/news/[slug]` | `app/(site)/news/[slug]/page.tsx` |
| `/otzyvy` | `app/(site)/otzyvy/page.tsx` |
| `/contacts` | `app/(site)/contacts/page.tsx` |
| `/o-nas` | `app/(site)/o-nas/page.tsx` |
| `/privacy` | `app/(site)/privacy/page.tsx` |
| `/oferta` | `app/(site)/oferta/page.tsx` |
| `/sotrudnichestvo` | `app/(site)/sotrudnichestvo/page.tsx` |
| `/sertifikaty-sootvetstviya` | `app/(site)/sertifikaty-sootvetstviya/page.tsx` |
| `/informaciya` | `app/(site)/informaciya/page.tsx` |

#### Вход и смена пароля

| Маршрут | Файл |
|---------|------|
| `/login` | `app/login/page.tsx` |
| `/login/2fa` | `app/login/2fa/page.tsx` |
| `/login/forgot-password` | `app/login/forgot-password/page.tsx` |
| `/login/reset-password` | `app/login/reset-password/page.tsx` |
| `/login/change-password` | `app/login/change-password/page.tsx` (+ `ChangePasswordForm.tsx`) |
| `/login/set-initial-password` | `app/login/set-initial-password/page.tsx` |

#### Админка

| Маршрут | Файл |
|---------|------|
| `/admin` (или `ADMIN_SECRET_PATH`) | `app/admin/page.tsx` |
| `/admin/catalog` | `app/admin/catalog/page.tsx` |
| `/admin/catalog/categories` | `app/admin/catalog/categories/page.tsx` |
| `/admin/products` | `app/admin/products/page.tsx` |
| `/admin/products/new` | `app/admin/products/new/page.tsx` |
| `/admin/products/[id]` | `app/admin/products/[id]/page.tsx` |
| `/admin/products/[id]/edit` | `app/admin/products/[id]/edit/page.tsx` |
| `/admin/products/import` | `app/admin/products/import/page.tsx` |
| `/admin/orders` | `app/admin/orders/page.tsx` |
| `/admin/orders-statistics` | `app/admin/orders-statistics/page.tsx` |
| `/admin/users` | `app/admin/users/page.tsx` |
| `/admin/settings` | `app/admin/settings/page.tsx` (в т.ч. настройки 2FA) |
| `/admin/profile` | `app/admin/profile/page.tsx` |
| `/admin/reviews` | `app/admin/reviews/page.tsx` |
| `/admin/news` | `app/admin/news/page.tsx` |
| `/admin/news/new` | `app/admin/news/new/page.tsx` |
| `/admin/news/edit/[id]` | `app/admin/news/edit/[id]/page.tsx` |
| `/admin/promo-codes` | `app/admin/promo-codes/page.tsx` |
| `/admin/tilda-leads` | `app/admin/tilda-leads/page.tsx` |
| `/admin/partnership` | `app/admin/partnership/page.tsx` |

#### Отладочные

| Маршрут | Файл |
|---------|------|
| `/debug-table` | `app/debug-table/page.tsx` |
| `/debug-profile-menu` | `app/debug-profile-menu/page.tsx` |
| `/debug-styles` | `app/debug-styles/page.tsx` |
| `/test-styles` | `app/test-styles/page.tsx` |
| `/simple-test` | `app/simple-test/page.tsx` |

### 3.3 Специальные маршруты

| Файл | Назначение |
|------|------------|
| `app/sitemap.ts` | Sitemap |
| `app/robots.ts` | Robots.txt (исключение админки) |
| `proxy.ts` | Прокси (упоминается в контексте) |

---

## 4. API Routes (nextjs-project/src/app/api/)

### 4.1 Auth

| Endpoint | Файл | Назначение |
|----------|------|------------|
| `GET/POST /api/auth/[...nextauth]` | `api/auth/[...nextauth]/route.ts` | NextAuth (signIn, signOut, session) |
| `POST /api/auth/login-step1` | `api/auth/login-step1/route.ts` | Email + пароль; при 2FA возвращает `need2FA`, иначе создаёт сессию |
| `POST /api/auth/verify-2fa` | `api/auth/verify-2fa/route.ts` | Проверка кода 2FA, выдача grant |
| `GET/POST /api/auth/2fa/setup` | `api/auth/2fa/setup/route.ts` | Статус/включение/отключение 2FA, настройка TOTP |
| `POST /api/auth/2fa/send-code` | `api/auth/2fa/send-code/route.ts` | Отправка кода по email |
| `POST /api/auth/forgot-password` | `api/auth/forgot-password/route.ts` | Запрос сброса пароля |
| `POST /api/auth/reset-password` | `api/auth/reset-password/route.ts` | Сброс пароля по токену |
| `POST /api/auth/change-password` | `api/auth/change-password/route.ts` | Смена пароля (авторизованный) |
| `POST /api/auth/send-initial-password-code` | `api/auth/send-initial-password-code/route.ts` | Код для установки начального пароля |
| `POST /api/auth/set-initial-password` | `api/auth/set-initial-password/route.ts` | Установка начального пароля |
| `POST /api/auth/verify-initial-code` | `api/auth/verify-initial-code/route.ts` | Проверка кода установки пароля |

### 4.2 Admin API (все требуют getServerSession)

| Endpoint | Файл |
|----------|------|
| `GET/POST /api/admin/settings` | `api/admin/settings/route.ts` |
| `GET/POST /api/admin/settings/telegram` | `api/admin/settings/telegram/route.ts` |
| `GET/POST /api/admin/settings/admins` | `api/admin/settings/admins/route.ts` |
| `GET/POST /api/admin/users` | `api/admin/users/route.ts` |
| `GET/PATCH/DELETE /api/admin/users/[id]` | `api/admin/users/[id]/route.ts` |
| `GET/POST /api/admin/products` | `api/admin/products/route.ts` |
| `POST /api/admin/products/upload-image` | `api/admin/products/upload-image/route.ts` |
| `POST /api/admin/products/upload-image-from-url` | `api/admin/products/upload-image-from-url/route.ts` |
| `GET/POST /api/admin/orders` | `api/admin/orders/route.ts` |
| `POST /api/admin/orders/[id]/cdek-shipment` | `api/admin/orders/[id]/cdek-shipment/route.ts` |
| `GET/POST /api/admin/reviews` | `api/admin/reviews/route.ts` |
| `GET/PATCH/DELETE /api/admin/reviews/[id]` | `api/admin/reviews/[id]/route.ts` |
| `GET/POST /api/admin/posts` | `api/admin/posts/route.ts` |
| `GET/PATCH/DELETE /api/admin/posts/[id]` | `api/admin/posts/[id]/route.ts` |
| `GET/POST /api/admin/profile` | `api/admin/profile/route.ts` |
| `GET/POST /api/admin/tilda-leads` | `api/admin/tilda-leads/route.ts` |
| `GET/POST /api/admin/partnership` | `api/admin/partnership/route.ts` |
| `GET/POST /api/admin/upload` | `api/admin/upload/route.ts` |
| `GET/POST /api/admin/promo-codes` | `api/admin/promo-codes/route.ts` |
| `GET/POST /api/admin/telegram/status` | `api/admin/telegram/status/route.ts` |
| `GET/POST /api/admin/telegram/whitelist` | `api/admin/telegram/whitelist/route.ts` |
| `POST /api/admin/telegram/link-code` | `api/admin/telegram/link-code/route.ts` |
| `POST /api/admin/telegram/confirm` | `api/admin/telegram/confirm/route.ts` |
| `GET /api/admin/telegram/promo-stats` | `api/admin/telegram/promo-stats/route.ts` |

### 4.3 Публичные / прочие API

| Endpoint | Файл |
|----------|------|
| `POST /api/orders` | `api/orders/route.ts` |
| `GET/POST /api/reviews` | `api/reviews/route.ts` |
| `GET /api/products/stock` | `api/products/stock/route.ts` |
| `POST /api/promo/validate` | `api/promo/validate/route.ts` |
| `POST /api/partnership` | `api/partnership/route.ts` |
| `POST /api/cdek/calculator` | `api/cdek/calculator/route.ts` |
| `GET /api/cdek/cities` | `api/cdek/cities/route.ts` |
| `GET /api/cdek/deliverypoints` | `api/cdek/deliverypoints/route.ts` |
| `POST /api/webhooks/yookassa` | `api/webhooks/yookassa/route.ts` |

---

## 5. Библиотеки и утилиты (nextjs-project/src/lib/)

| Файл | Назначение |
|------|------------|
| `auth.ts` | NextAuth options: Credentials, grantToken, JWT/session callbacks |
| `prisma.ts` | Prisma client (pg adapter, DATABASE_URL), dotenv |
| `password.ts` | verifyPassword, hashPassword, isBcryptHash |
| `password-reset.ts` | Токены сброса пароля |
| `set-initial-password.ts` | Установка начального пароля, коды по email |
| **2FA** | |
| `two-factor.ts` | Cookie two_factor_pending, создание/проверка pending, createGrant/consumeGrant (TwoFactorGrant) |
| `totp.ts` | TOTP (otplib): генерация/проверка, шифрование секрета AES-256-GCM (TOTP_SECRET_ENCRYPTION_KEY) |
| `email.ts` | Nodemailer, send2FACodeEmail и др. письма |
| **Каталог и заказы** | |
| `catalog-categories.ts` | Категории каталога |
| `yookassa.ts` | ЮKassa (платежи) |
| `cdek.ts` | СДЭК (доставка, калькулятор, города, ПВЗ) |
| **Валидация** | |
| `validations/order.ts` | Валидация заказа |
| `validations/cdek.ts` | Валидация СДЭК |
| `validations/promo.ts` | Валидация промокода |
| **Прочее** | |
| `telegram-notify.ts` | Уведомления в Telegram |
| `rate-limit.ts` | Rate limiting |
| `sanitize-text.ts` | Санитизация HTML/текста |
| `slugify.ts` | Slug |
| `utils.ts` | Общие утилиты |
| `test-env.ts` | Проверка env |

### 5.1 Контент и константы

| Путь | Назначение |
|------|------------|
| `content/category-descriptions.ts` | Описания категорий |
| `app/admin/catalog/constants.ts` | Константы каталога админки |

---

## 6. Компоненты (nextjs-project/src/components/)

### 6.1 UI (components/ui/)

- `button.tsx`, `input.tsx`, `textarea.tsx`
- `tabs.tsx`, `breadcrumb.tsx`
- `liquid-glass-button.tsx`, `tilt-card.tsx`

### 6.2 Сайт (components/site/)

- `site-header.tsx`, `site-footer.tsx`, `header-nav-mobile.tsx`
- `cart-drawer.tsx`, `header-cart-button.tsx`, `cart-page-content.tsx`, `cart-return-message.tsx`
- `product-card.tsx`, `product-page-content.tsx`, `product-tabs.tsx`, `add-to-cart-button.tsx`
- `hero-block.tsx`, `gallery-block.tsx`, `partners-block.tsx`, `sprint-power-block.tsx`, `sprint-power-banner.tsx`
- `reviews-carousel.tsx`, `review-form.tsx`
- `post-card.tsx`
- `delivery-section.tsx`, `yandex-map.tsx`, `yandex-map-pvz.tsx`
- `partnership-form.tsx`, `contact-links.tsx`
- `breadcrumbs.tsx`, `cookie-consent.tsx`

### 6.3 Админка (app/admin/...)

- `app/admin/components/AdminNav.tsx`, `AdminLayoutClient.tsx`, `ProfileMenu.tsx`
- `app/admin/context/admin-base-path.tsx`
- `app/admin/catalog/components/ProductTable.tsx`, `CategorySidebar.tsx`, `ImportSection.tsx`
- `app/admin/products/components/ProductRichTextEditor.tsx`, `ProductGalleryEditor.tsx`, `CategoryMultiSelect.tsx`, `ImageDropzone.tsx`
- `app/admin/news/components/RichTextEditor.tsx`, `EditorMediaPanel.tsx`, `CoverImageDropzone.tsx`, редактор (custom-ordered-list, custom-bullet-list)
- `app/(site)/otzyvy/reviews-section.tsx`

---

## 7. Хуки, store, типы

| Путь | Назначение |
|------|------------|
| `store/cart-store.ts` | Zustand: корзина |
| `hooks/use-prevent-leave-when-dirty.ts` | Предупреждение при уходе с грязной формы |
| `hooks/use-mounted.ts` | Монтирование компонента |
| `types/next-auth.d.ts` | Расширение User/Session (id, role, mustChangePassword) |

---

## 8. Prisma (nextjs-project/prisma/)

### 8.1 Схема (schema.prisma)

- **Provider:** PostgreSQL  
- **Client:** через `@prisma/adapter-pg` и pg.Pool в `src/lib/prisma.ts`

### 8.2 Модели

| Модель | Ключевые поля / назначение |
|--------|----------------------------|
| **Product** | tildaUid, slug, title, price, quantity, weight, length/width/height (СДЭК), photos (Json), cartItems, orderItems, categories |
| **Category** | title, slug, image, sortOrder |
| **ProductCategory** | Связь productId–categoryId |
| **CartItem** | productId, quantity |
| **Order** | userId, total, status, yookassaPaymentId, cdekOrderUuid, cdekOrderError, shippingInfo, promoCodeId |
| **OrderItem** | orderId, productId, quantity, price |
| **ShippingInfo** | orderId, fullName, phone, email, address, city, zipCode, country, deliveryMethod, cdekCityCode, cdekPvzCode, cdekTariffCode, street, house, apartment и т.д. |
| **User** | email, password, name, lastName, phone, notificationEmail, role (USER\|WRITER\|ADMIN), mustChangePassword, **twoFactorEnabled**, **twoFactorMethod**, **totpSecretEncrypted**; связи: TwoFactorPending, TwoFactorGrant, PasswordResetToken, SetInitialPasswordToken, TelegramWhitelist, TelegramLinkCode |
| **TwoFactorPending** | userId, tokenHash, expiresAt, emailCodeHash, emailCodeExpiresAt |
| **TwoFactorGrant** | userId, usedAt, expiresAt |
| **PasswordResetToken** | userId, tokenHash, expiresAt, usedAt |
| **SetInitialPasswordToken** | userId, tokenHash, expiresAt, emailCodeHash, emailCodeExpiresAt, codeVerifiedAt, usedAt |
| **TelegramWhitelist** | userId, telegramUserId, linkedAt |
| **TelegramLinkCode** | code, userId, expiresAt |
| **Post** | title, slug, type (news/article), excerpt, content (Json), previewImage, published |
| **PromoCode** | code, discountType, discountValue, isActive, usageLimit, usedCount, validFrom, validTo |
| **PartnershipLead** | name, email, phone, role, socialLinks, message |
| **SiteSetting** | key, value |
| **Review** | authorName, socialLink, text, imageUrl, status (PENDING\|APPROVED\|REJECTED) |
| **TildaLead** | email, name, phone, tildaDate, tildaTranId, input, input2, comment, deliveryAddress, review, delivery, promoCode |

### 8.3 Миграции

- Папка: `nextjs-project/prisma/migrations/`
- Команды: `prisma migrate dev`, `prisma migrate deploy`, `prisma migrate status`, `prisma migrate reset`

---

## 9. Аутентификация и 2FA (сводка)

- **NextAuth v4:** Credentials + JWT, сессия 30 дней, страница входа `/login`.
- **Вход:** `login/page.tsx` → POST `/api/auth/login-step1` (email + password). При `need2FA` → редирект на `/login/2fa?method=email|totp`. Иначе `signIn('credentials', ...)` и редирект в админку или на смену пароля.
- **2FA:** `login/2fa/page.tsx` → ввод кода → POST `/api/auth/verify-2fa` → при успехе `signIn('credentials', { grantToken })` → редирект.
- **Настройки 2FA:** `admin/settings/page.tsx` → GET/POST `/api/auth/2fa/setup` (статус, включение/отключение, TOTP).
- **Логика:** `lib/auth.ts` (authorize: grantToken или email+password; при twoFactorEnabled без grant — null), `lib/two-factor.ts` (pending, grant), `lib/totp.ts` (TOTP, шифрование секрета), `lib/email.ts` (send2FACodeEmail).
- **Env 2FA:** `TOTP_SECRET_ENCRYPTION_KEY` (32 байта base64), `NEXTAUTH_SECRET`, SMTP для кодов по email.

---

## 10. Переменные окружения (по коду)

| Переменная | Использование |
|------------|----------------|
| `DATABASE_URL` | Prisma |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth, подпись cookie 2FA |
| `APP_URL`, `NEXT_PUBLIC_SITE_URL` | Ссылки в письмах |
| `TOTP_SECRET_ENCRYPTION_KEY` | Шифрование TOTP-секрета (lib/totp.ts) |
| `ADMIN_SECRET_PATH` | Базовый путь админки (по умолчанию `'admin'`) |
| SMTP (`SMTP_HOST`, `SMTP_PORT`, и т.д.) | Письма (в т.ч. коды 2FA) |

Документация по env: `nextjs-project/docs/2fa-env.md`, `nextjs-project/docs/password-reset-env.md`, `docs/env's.md`.

---

## 11. Документация (docs/)

| Файл | Тема |
|------|------|
| `STATUS.md` | Статус проекта |
| `adm_now.md`, `adminv2.md` | Админка |
| `categories.md`, `category-implementation.md` | Категории |
| `deploy.md`, `deploy-vps.md` | Деплой (в т.ч. Docker) |
| `performance-optimization.md` | Оптимизация |
| `prisma-migrations-and-deploy.md` | Миграции Prisma |
| `tg_bot.md` | Telegram-бот |
| `tilda-leads-order-composition.md` | Лиды Тильды |
| `step_1_base.md` … `step_8_design.md` | Legacy: шаги разработки (актуальный статус — STATUS.md) |
| `docs/plans/2026-02-24-2fa.md` | ТЗ 2FA |
| `docs/plans/2026-02-24-2fa-design.md` | Дизайн 2FA |
| `docs/plans/2026-02-24-cdek-order-after-payment.md` | СДЭК после оплаты |
| `docs/plans/2026-02-23-roadmap-batch.md` | Roadmap batch |

---

## 12. Actions (Server Actions)

| Путь | Назначение |
|------|------------|
| `app/admin/products/new/actions.ts` | Создание товара |
| `app/admin/products/import/actions.ts` | Импорт товаров |
| `app/admin/catalog/actions.ts` | Действия каталога |

---

*Индекс собран для навигации по проекту при проработке ТЗ (в т.ч. 2FA, СДЭК, админка).*
