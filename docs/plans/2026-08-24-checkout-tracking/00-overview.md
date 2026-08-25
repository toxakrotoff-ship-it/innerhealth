# Отслеживание незавершённых заказов (checkout tracking) — разбивка на PR

Источник: ТЗ «отслеживание незавершённых заказов и причин отказа в InnerHealth»
(получено 2026-08-24). Ниже — декомпозиция на последовательные PR под реальный стек
проекта.

## Важное расхождение ТЗ ↔ реальный стек

ТЗ написано в терминах Django (`models.py`, `views.py`, Django admin, "background
workers/очередь"). Репозиторий `innerhealth` — это **Next.js 16 (App Router) + React 19
+ TypeScript + Prisma 7 + PostgreSQL**, без Celery/очередей, с кастомной админкой на
страницах `src/app/admin/*`. Весь план ниже — это ТЗ, переформулированное в терминах
реального стека, без потери смысла исходных требований (разделы 1–38 ТЗ).

Сущности из ТЗ `CheckoutSession`/`CheckoutEvent` → Prisma-модели `CheckoutSession` /
`CheckoutEvent` в `nextjs-project/prisma/schema.prisma`. "Background worker" → HTTP
cron-эндпоинт с токен-авторизацией + bash-обёртка в `deploy/ops/`, по образцу уже
существующего `api/cron/yookassa-poll`.

## Найденные точки переиспользования (не дублировать!)

| Что нужно | Что уже есть в проекте | Путь |
|---|---|---|
| Единая точка перехода статуса с идемпотентностью и разными источниками | `transitionOrderToPaid/Canceled(orderId, source)` | `nextjs-project/src/lib/order-payment-flow.ts` |
| HTTP cron с токен-авторизацией + VPS crontab | `api/cron/yookassa-poll` + `deploy/ops/yookassa-poll.sh` | `nextjs-project/src/app/api/cron/yookassa-poll/route.ts` |
| Резолвинг витрины из запроса | `resolveBrandOrDefaultFromRequest`, `resolveAdminBrandFromRequest` | `nextjs-project/src/lib/brand/brand-request.ts` |
| Append-only событийный лог с `meta: Json` | `AnalyticsEvent` (`sessionId`, `anonId`, `type`, `meta`) | Prisma schema, модель `AnalyticsEvent` |
| Fire-and-forget логирование, не ломающее основной поток | `logActivity()` | `nextjs-project/src/lib/activity-log.ts` |
| Пересчёт цен/скидок на сервере, не доверяя клиенту | `POST /api/orders` | `nextjs-project/src/app/api/orders/route.ts` |
| ЮKassa клиент | `createYookassaPayment`, `getYookassaPayment` | `nextjs-project/src/lib/yookassa.ts` |
| Management-скрипт для периодической очистки | `scripts/cleanup-auth-tokens.ts` | `nextjs-project/scripts/` |

## Порядок PR и зависимости

```
PR1 (data model)
  └─▶ PR2 (tracking service)
        ├─▶ PR3 (wire into checkout flow)
        └─▶ PR4 (payment tracking)
              └─▶ PR5 (abandoned detection cron)
PR1..PR5 ─▶ PR6 (admin: список)
              └─▶ PR7 (admin: карточка/timeline)
PR1..PR7 ─▶ PR8 (retention/privacy)
PR1..PR7 ─▶ PR9 (тесты) — можно и нужно писать тесты внутри каждого PR по ходу,
             PR9 — это добивание сквозных сценариев (storefront isolation,
             idempotency, e2e-путь), не единственное место с тестами
```

PR1–PR5 — backend/data слой, можно катить в продакшен по одному (каждый PR сам по себе
не ломает текущий checkout, т.к. только добавляет параллельный necessary-slim tracking
layer, не трогая `Order`/`OrderItem`/checkout API контракт). PR6–PR7 — админка, PR8 —
privacy/retention, PR9 — тесты (частично распределены по PR1–PR7, частично сквозные).

## Сквозные технические договорённости (одинаковы для всех PR)

- **Не трогать бизнес-смысл `Order.status`.** Никаких `abandoned_cart` и т.п. в `Order`.
  CheckoutSession — отдельный слой, `Order` создаётся так же, как сейчас.
- **Не строить параллельный checkout.** Tracking встраивается в существующие
  `cart-page-content.tsx` и `POST /api/orders`, а не подменяет их.
- **Источник переходов статуса** — по аналогии с `OrderPaymentTransitionSource`, у
  `CheckoutSession` будет свой `CheckoutTransitionSource = 'client' | 'webhook' |
  'cron-scan' | 'admin-sync'`, все переходы — через один сервисный модуль.
  Идемпотентность обязательна: повторный `payment_succeeded` не должен дважды менять
  состояние; повторный callback не создаёт вторую сессию/заказ.
- **Privacy whitelist.** Ни в `CheckoutEvent.metadata`, ни в `CheckoutSession` не
  попадают: номер карты, CVV, payment secrets, auth-токены, cookies, пароли, полный raw
  provider payload. Из provider payload — только конкретный whitelist полей
  (`id`, `status`, `error_code`, `error_description`), собираемый явной функцией
  `normalizeYookassaError(...)`/аналогом, а не `JSON.stringify(payload)` целиком.
- **Storefront scoping везде.** Каждая модель — с полем `brand String @default("inner")`
  (как у `Order`/`AnalyticsEvent`), каждый queryset/API/admin/cron — фильтрует по
  бренду через существующие `resolveBrandOrDefaultFromRequest`/
  `resolveAdminBrandFromRequest`.
- **Гостевая идентификация — opaque, не последовательный id.** `CheckoutSession.id` —
  `cuid()` (уже неугадываемый), но публичный доступ гостя к своей сессии
  дополнительно защищён httpOnly cookie-токеном (см. PR2), а не просто фактом знания
  `id`.
- **Не логировать на каждый `mousemove`/`input`/render.** Значимые переходы — это шаги
  из ТЗ раздела 5–6, ожидаемый объём — 5–20 событий на checkout, не сотни. Для
  «печатает телефон» использовать debounce (не менее 800мс) + событие только один раз
  на «поле подтверждено» (blur/valid), а не на каждое нажатие клавиши.
- **Frontend не источник истины** для `order_created`/`payment_created`/
  `payment_succeeded`/`payment_failed` — эти события подтверждаются backend/provider
  callback. Frontend может слать чисто UX-события (`checkout_page_opened`,
  `payment_redirect_started`).

## Карта acceptance criteria ТЗ → PR

| Сценарий из ТЗ §35 | Покрывается в PR |
|---|---|
| 1. Ввёл телефон, закрыл сайт → виден телефон, корзина, этап "контакты" | PR2, PR3, PR6, PR7 |
| 2. Контакты + доставка, не подтвердил → видна доставка, причина "не подтвердил заказ" | PR2, PR3, PR6, PR7 |
| 3. Заказ создан, не дошёл до оплаты | PR3, PR4, PR6, PR7 |
| 4. Дошёл до оплаты, не оплатил → abandoned после timeout | PR4, PR5, PR7 |
| 5. Банк отклонил платёж → payment_failed с provider code/message | PR4, PR7 |
| 6. Успешная оплата → completed, связан с заказом, не в списке незавершённых | PR4, PR6 |
| 7. Storefront isolation | PR1 (поле brand), PR6 (queryset), PR9 (тест) |

## Файлы этого PR-набора

1. `01-data-model.md`
2. `02-tracking-service.md`
3. `03-wire-into-checkout-flow.md`
4. `04-payment-tracking.md`
5. `05-abandoned-detection.md`
6. `06-admin-list.md`
7. `07-admin-detail.md`
8. `08-retention-and-privacy.md`
9. `09-tests.md`
