# Prisma: миграции и подготовка к деплою

Схема и миграции находятся в **nextjs-project/prisma/** (schema.prisma, migrations/). Подключение к БД задаётся в `nextjs-project/prisma.config.ts` через переменную `DATABASE_URL` (из .env / .env.local).

## Текущее состояние миграций

В **nextjs-project/prisma/migrations/** лежат миграции в порядке применения:

| Миграция | Описание |
|----------|----------|
| `20260213120000_init` | Базовые таблицы: Product, Category, CartItem, Order, OrderItem, User, PasswordResetToken, ShippingInfo, Post |
| `20260219104900_add_product_category_table` | ProductCategory (связь продукт–категория) |
| `202602191103_add_promo_code_model` | Таблица PromoCode |
| `202602191106_add_promo_code_to_order` | Поле Order.promoCodeId |
| `20260220160000_add_product_slug_and_tab_titles` | Product: slug, tab1Title–tab4Title |
| `20260221100000_add_must_change_password` | User.mustChangePassword |
| `20260221120000_add_partnership_lead` | Таблица PartnershipLead |
| `20260221130000_add_partnership_lead_social_links` | PartnershipLead.socialLinks |
| `20260221140000_add_tilda_lead_model` | Таблица TildaLead |
| `20260221150000_add_yookassa_payment_id` | Поле заказа для ID платежа ЮKassa |
| `20260221160000_add_site_setting` | Таблица SiteSetting (настройки сайта) |

На **новой** (пустой) production-БД достаточно выполнить из каталога nextjs-project: `npx prisma migrate deploy` — все миграции применятся по порядку.

---

## Расхождение с локальной БД (если есть)

Если локальная БД создавалась раньше и в ней есть миграция `20260214212546_init`, которой уже нет в репозитории, Prisma покажет расхождение. Команда `--rolled-back` для такой миграции **не сработает** (P3012: миграция не в состоянии failed). Используйте шаги ниже.

### Порядок действий

```bash
cd nextjs-project
```

1. **Считать нашу init уже применённой** (если ещё не делали):
   ```bash
   npx prisma migrate resolve --applied "20260213120000_init"
   ```

2. **Упавшую миграцию** `20260219104900_add_product_category_table` пометить как успешно применённую (таблица ProductCategory уже есть):
   ```bash
   npx prisma migrate resolve --applied "20260219104900_add_product_category_table"
   ```

3. **Удалить запись о старой init** из таблицы миграций:
   ```bash
   npm run db:fix-history
   ```

4. **Применить оставшиеся миграции**:
   ```bash
   npx prisma migrate deploy
   ```

После этого `npx prisma migrate status` (из nextjs-project) должен показать, что все миграции применены.

---

## Деплой приложения (production)

### Переменные окружения

Используются те же переменные, что и локально (см. `docs/env's.md`). Обязательно задать:

- `DATABASE_URL` — строка подключения к PostgreSQL в проде
- `NEXTAUTH_SECRET` — секрет для NextAuth
- `NEXT_PUBLIC_SITE_URL` — URL сайта (например `https://innerhealth.ru`)
- Остальные по необходимости: YooKassa, CDEK, SMTP, `ADMIN_SECRET_PATH`, `UPLOAD_STRATEGY` и т.д.

Подключение к БД для Prisma берётся из **nextjs-project/prisma.config.ts** (переменная `DATABASE_URL` из .env / .env.local).

### Шаги при деплое

1. **Установка зависимостей**
   ```bash
   npm ci
   ```

2. **Генерация Prisma Client**
   ```bash
   npm run db:generate
   ```
   или `npx prisma generate` (уже вызывается в `postinstall`).

3. **Применение миграций к production-БД**
   ```bash
   npm run db:migrate
   ```
   или `npx prisma migrate deploy`.  
   Важно: использовать именно `migrate deploy`, а не `db push` — так сохраняется история миграций и предсказуемость на проде.

4. **Сборка и запуск**
   ```bash
   npm run build
   npm run start
   ```

### Скрипты в package.json

- `db:generate` — `prisma generate`
- `db:migrate` — `prisma migrate deploy` (для деплоя)
- `db:push` — `prisma db push` (только для быстрого прототипа/dev, на проде не использовать)

---

## Рекомендации перед деплоем

1. Проверить статус миграций локально: `npx prisma migrate status`.
2. Не менять уже применённые миграции и не удалять папки из `prisma/migrations/`.
3. Новые изменения схемы — только через `npx prisma migrate dev` (создаст новую миграцию).
4. На проде не использовать `prisma db push` и не вносить схему вручную — только `prisma migrate deploy`.
5. Бэкапы БД перед применением миграций на production.
