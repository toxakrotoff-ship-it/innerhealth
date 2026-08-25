# PR4 — Payment tracking (ЮKassa) + различение ошибки/брошенной оплаты

## Цель

Провести жизненный цикл платежа через `CheckoutSession`/`CheckoutEvent`, переиспользуя
существующие точки интеграции с ЮKassa, и явно развести "банк отклонил" (`payment_failed`)
от "просто не завершил" (обрабатывается в PR5 через timeout, здесь только не мешаем).

Зависимости: PR2 (сервис), PR3 (`checkoutSessionId` уже долетает до `POST /api/orders`).

## Новый файл: `nextjs-project/src/lib/checkout-session-flow.ts`

По прямому образцу `order-payment-flow.ts` — один модуль с переходами статуса,
идемпотентный, принимающий источник:

```ts
export type CheckoutTransitionSource = 'client' | 'webhook' | 'cron-scan' | 'admin-sync'

export async function trackPaymentInitialized(sessionId, source): Promise<void>
// currentStep = PAYMENT_INITIALIZATION, событие PAYMENT_INITIALIZATION_STARTED

export async function trackPaymentCreated(
  sessionId, source, payment: { provider: 'yookassa'; paymentId: string; status: string }
): Promise<void>
// currentStep = PAYMENT_CREATED, denorm paymentProvider/paymentId/paymentStatus,
// событие PAYMENT_CREATED с metadata { paymentId, status }

export async function trackPaymentRedirected(sessionId, source): Promise<void>
// currentStep = PAYMENT_REDIRECT, событие PAYMENT_REDIRECTED

export async function trackPaymentCallback(
  sessionId, source, payload: { status: string; raw?: unknown }
): Promise<void>
// событие PAYMENT_CALLBACK_RECEIVED, currentStep = PAYMENT_PROCESSING;
// metadata только whitelisted-поля (см. PR8), не raw payload целиком

export async function transitionCheckoutToPaymentSucceeded(sessionId, source): Promise<{ changed: boolean }>
// идемпотентно: если уже COMPLETED — {changed:false}. Иначе status=COMPLETED,
// currentStep=COMPLETED, completedAt=now(), событие PAYMENT_SUCCEEDED + CHECKOUT_COMPLETED

export async function transitionCheckoutToPaymentFailed(
  sessionId, source, error: PaymentProviderError
): Promise<{ changed: boolean }>
// идемпотентно: если уже COMPLETED/PAYMENT_FAILED — {changed:false}.
// status=PAYMENT_FAILED, событие PAYMENT_FAILED с structured error (см. ниже)

export async function transitionCheckoutToPaymentCancelled(sessionId, source): Promise<{ changed: boolean }>
// status=PAYMENT_CANCELLED, событие PAYMENT_CANCELLED
```

## Точки интеграции (существующие файлы, минимальные правки)

1. **`nextjs-project/src/app/api/orders/route.ts`** — сразу после
   `createYookassaPayment(...)`:
   - до вызова: `trackPaymentInitialized(sessionId, 'client')`
   - после успеха: `trackPaymentCreated(sessionId, 'client', { provider: 'yookassa',
     paymentId, status })`, затем `trackPaymentRedirected(sessionId, 'client')` (редирект
     на `confirmationUrl` происходит сразу же, это одна логическая цепочка на этом
     этапе).
   - при ошибке создания платежа (catch вокруг `createYookassaPayment`) —
     `trackCheckoutError(sessionId, { source: 'payment_provider', code: ...,
     message: ..., httpStatus })` (ТЗ §7, пример "Ошибка создания платежа").

2. **`nextjs-project/src/app/api/webhooks/yookassa/route.ts`** — после того как webhook
   уже нашёл `order` по `metadata.orderId` и перепроверил статус через
   `GET /payments/{id}`:
   - найти `CheckoutSession` по `order.id` (через `checkoutSession.orderId`, обратная
     связь) — если сессии нет (заказ оформлен до раскатки фичи), просто пропустить
     tracking, не падать.
   - `trackPaymentCallback(sessionId, 'webhook', { status })`.
   - если статус `succeeded` → `transitionCheckoutToPaymentSucceeded(sessionId,
     'webhook')` **после** (не вместо) существующего `transitionOrderToPaid(...)`.
   - если статус `canceled` с `cancellation_details.reason` похожим на отказ банка
     (`payment_declined` и т.п.) → `transitionCheckoutToPaymentFailed(sessionId,
     'webhook', normalizeYookassaError(details))`; если reason — явная отмена
     пользователем/по таймауту ЮKassa (`expired_on_confirmation`) →
     `transitionCheckoutToPaymentCancelled(sessionId, 'webhook')` (это и есть граница
     ТЗ §9 "ошибка оплаты" vs "брошенная оплата" — expired_on_confirmation ближе к
     "пользователь не завершил", не к банковскому отказу, но у нас для него уже есть
     явный сигнал от ЮKassa, поэтому это `PAYMENT_CANCELLED`, а не оставлять "тикать"
     до cron-timeout).

3. **`nextjs-project/src/lib/yookassa-sync-service.ts`** (`syncPendingOrdersBatch`) —
   зеркально webhook-логике, но `source: 'cron-poll'` → `'cron-scan'`. Это тот же путь,
   что уже проверяет `GET /payments/{id}` для заказов без вебхука.

4. **`nextjs-project/src/app/api/admin/orders/[id]/yookassa-sync/route.ts`** и
   `.../yookassa-sync-bulk/route.ts` — `source: 'admin-sync'`, тот же паттерн.

## Структурированные ошибки (ТЗ §7)

Тип, используемый в `trackCheckoutError` и `transitionCheckoutToPaymentFailed`:

```ts
type PaymentProviderError = {
  source: 'payment_provider'
  code: string            // например 'PAYMENT_DECLINED', маппится из ЮKassa error/reason кодов
  message: string         // человеко-читаемое на основе кода (см. PR7 для полного маппинга)
  httpStatus?: number
  providerStatus?: string // 'canceled' | 'failed' и т.п. как есть у ЮKassa
}
type BackendError = {
  source: 'backend'
  endpoint: string
  code: string
  message: string
  httpStatus: number
}
```

`normalizeYookassaError(cancellationDetails)` — новая функция в `lib/yookassa.ts` (или
рядом), маппит `cancellation_details.reason` ЮKassa на `code`/`message` — whitelist
известных reason'ов, без пробрасывания сырого ответа банка.

## Что НЕ делать в этом PR

- Не решать "abandoned" здесь синхронно — если после `PAYMENT_REDIRECT` ничего не
  пришло (ни webhook succeeded, ни webhook/cron failed/cancelled), это остаётся
  `status = ACTIVE` до тех пор, пока не отработает cron из PR5. Не помечать как
  ошибку то, что является просто отсутствием ответа.
- Не менять `transitionOrderToPaid/Canceled` — новый код только *добавляет* вызовы
  checkout-tracking рядом, не переписывает существующую логику заказа/CDEK/уведомлений.
- Не хранить `raw` вебхук-payload в `CheckoutEvent.metadata` без whitelisting (полная
  политика — PR8, но уже в этом PR whitelisting обязателен, не откладывается).

## Проверка

- Тест: успешный webhook `succeeded` → `CheckoutSession.status = COMPLETED`,
  `orderId` проставлен, событие `CHECKOUT_COMPLETED` создано один раз даже при
  повторном вызове webhook (идемпотентность).
- Тест: webhook с отказом банка → `status = PAYMENT_FAILED`, `CheckoutEvent` с
  `metadata.code = 'PAYMENT_DECLINED'` (или соответствующим), без raw payload.
- Тест: `cron-poll`/`admin-sync` пути дают тот же результат, что webhook, для одного
  и того же `orderId` (не дублируют события).
