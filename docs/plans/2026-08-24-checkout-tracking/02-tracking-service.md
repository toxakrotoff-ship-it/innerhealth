# PR2 — Централизованный сервис трекинга + гостевая идентификация

## Цель

Дать один сервисный слой для записи состояния/событий checkout, чтобы в PR3–PR5 никто
не писал `prisma.checkoutEvent.create(...)` напрямую по вьюхам (требование ТЗ §22 —
не размазывать прямые вызовы по десяткам views). Плюс — механизм opaque-идентификации
гостя.

Зависимости: PR1 (модели).

## Новые файлы

### `nextjs-project/src/services/checkout-session.service.ts`

По образцу `src/services/order.service.ts` — чистый доступ к Prisma, без бизнес-логики
принятия решений (когда звать — решает `checkout-tracking.ts`).

```ts
findActiveSessionByGuestToken(guestToken: string, brand: string): Promise<CheckoutSession | null>
findActiveSessionByUserId(userId: string, brand: string): Promise<CheckoutSession | null>
createSession(input: { brand, userId?, guestToken? }): Promise<CheckoutSession>
updateSessionContact(id, { fullName?, phone?, email? }): Promise<CheckoutSession>
updateSessionCart(id, { cartSnapshot, cartItemsCount, cartTotal, deliveryMethod?, deliverySum?, promoCode? }): Promise<CheckoutSession>
updateSessionStep(id, { currentStep, lastCompletedStep? }): Promise<CheckoutSession>
updateSessionStatus(id, status: CheckoutStatus): Promise<CheckoutSession>
linkOrder(id, orderId): Promise<CheckoutSession>
updateSessionPayment(id, { paymentProvider?, paymentId?, paymentStatus? }): Promise<CheckoutSession>
touchActivity(id): Promise<void>  // lastActivityAt = now(), плюс abandoned -> active если применимо
createEvent(sessionId, eventType, step?, metadata?): Promise<CheckoutEvent>
findSessionForAdmin(id, brand): Promise<CheckoutSession & { events, order } | null>
listSessionsForAdmin(filters): Promise<...>  // используется в PR6
findStaleActiveSessions(olderThan: Date, brand?): Promise<CheckoutSession[]>  // используется в PR5
```

### `nextjs-project/src/lib/checkout-tracking.ts`

Публичный API, которым пользуются route handlers и `cart-page-content.tsx` (через API,
не напрямую). Это тот самый сервис из ТЗ §22 с адаптированными именами:

```ts
export async function startCheckout(params: {
  brand: BrandId
  userId?: string | null
  guestToken?: string | null
}): Promise<{ session: CheckoutSession; guestToken: string | null }>
// если userId есть — ищет/создаёт сессию по userId; если нет — по guestToken
// (генерирует новый opaque токен, если guestToken не передан или невалиден)

export async function updateCheckoutContact(
  sessionId: string, guestToken: string | null,
  contact: { fullName?: string; phone?: string; email?: string }
): Promise<CheckoutSession>
// проверяет владение (см. "Контроль доступа" ниже), пишет CONTACT_ENTERED

export async function updateCheckoutCart(
  sessionId: string, guestToken: string | null, cart: CartSnapshotInput
): Promise<CheckoutSession>

export async function trackCheckoutStep(
  sessionId: string, guestToken: string | null,
  step: CheckoutStep, eventType: CheckoutEventType, metadata?: Record<string, unknown>
): Promise<CheckoutSession>
// обновляет current_step/last_completed_step + создаёт событие, одной транзакцией

export async function trackCheckoutEvent(
  sessionId: string, eventType: CheckoutEventType,
  step?: CheckoutStep, metadata?: Record<string, unknown>
): Promise<void>
// для событий без смены шага (например PAYMENT_CALLBACK_RECEIVED)

export async function trackCheckoutError(
  sessionId: string,
  error: { source: 'backend' | 'payment_provider'; code: string; message: string; httpStatus?: number; providerStatus?: string; endpoint?: string }
): Promise<void>
// eventType = API_ERROR | VALIDATION_ERROR | PAYMENT_PROVIDER_ERROR по source,
// metadata строго whitelisted-структура из ТЗ §7 (см. PR8 для функции whitelisting)

export async function completeCheckout(sessionId: string, orderId: string): Promise<void>
// status = COMPLETED, orderId привязан, событие CHECKOUT_COMPLETED
```

`trackPaymentEvent(...)` — отдельно в PR4 (`checkout-session-flow.ts`), т.к. завязан на
`CheckoutTransitionSource` и идемпотентность перехода статуса, а не просто на запись
события.

## Гостевая идентификация (ТЗ §25)

- При первом обращении к checkout (см. PR3, `checkout_page_opened`/`startCheckout`)
  сервер генерирует `guestToken = randomBytes(24).toString('base64url')` (криптостойкий,
  не `crypto.randomUUID()` — он для этого тоже подходит, но берём `randomBytes` для
  явного соответствия "opaque capability token", не последовательный и не предсказуемый)
  и кладёт его в **httpOnly, `SameSite=Lax`, `Secure` в проде** cookie
  `ih_checkout_token` (аналогично `ADMIN_BRAND_COOKIE_NAME` — паттерн cookie-имён из
  `lib/brand/`), TTL = retention-срок сессии (см. PR8, по умолчанию 30 дней).
- Каждый API-запрос к `PATCH /api/checkout/session/[id]/*` (PR3) сверяет cookie-токен
  с `CheckoutSession.guestToken` этой записи (или, если пользователь залогинен —
  сверяет `session.userId === checkoutSession.userId`). Несовпадение → 404 (не 403 —
  чтобы не подтверждать существование чужого id).
- Для залогиненного пользователя `guestToken` не обязателен — идентификация через
  `getServerSession(authOptions)`, как в `POST /api/orders` сегодня.
- При логине гостя с активной checkout-сессией — просто проставить `userId` на
  существующую сессию (`updateSessionContact`/аналог), не создавать вторую.

## Идемпотентность / concurrency (ТЗ §31)

- `startCheckout` — `upsert`-подобная логика: если для (userId|guestToken, brand) уже
  есть сессия в статусе, отличном от `COMPLETED`/`EXPIRED`, переиспользовать её
  (обновить `lastActivityAt`), не плодить новую на каждый reload страницы корзины.
- Все update-методы сервиса — точечные `prisma.checkoutSession.update`, без
  read-modify-write гонок на бизнес-полях (кроме перехода статуса — см. PR4/PR5, где
  переход делается через `updateMany({ where: { status: 'ACTIVE' }, data: {...} })` с
  проверкой количества затронутых строк, чтобы двойной cron-тик не сработал дважды).

## Что НЕ делать в этом PR

- Не давать route handlers звать `prisma.checkoutEvent.create` напрямую — только через
  `checkout-tracking.ts`.
- Не завязывать гостевой токен на `Order`/`ShippingInfo` — это независимый механизм.
- Не переиспользовать `AnalyticsEvent.anonId` как единственный идентификатор доступа
  (он не httpOnly, генерируется в `localStorage`, легко подделывается) — можно
  сохранить его в `CheckoutSession.anonId` для будущей аналитики (связка с воронкой
  PAGE_VIEW → CHECKOUT_START), но не для авторизации доступа к данным.

## Проверка

- Unit-тесты сервиса: `startCheckout` не плодит дубли при повторном вызове с тем же
  токеном; `updateCheckoutContact` с чужим/отсутствующим токеном кидает "не найдено";
  вход под юзером переиспользует гостевую сессию, если она была.
