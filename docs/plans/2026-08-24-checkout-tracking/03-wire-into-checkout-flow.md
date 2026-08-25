# PR3 — Встраивание трекинга в существующий checkout

## Цель

Заставить реальные пользовательские действия (открыл корзину, ввёл контакты, выбрал
доставку, применил промокод, создал заказ) писаться в `CheckoutSession`/`CheckoutEvent`
по мере происходящего — а не только в момент, когда пользователь уже дожал форму до
конца (сегодня `logAnalyticsEvent({ type: 'CHECKOUT_START' })` в
`cart-page-content.tsx` стреляет только внутри `handleSubmitOrder`, то есть уже post
factum). Это прямое требование ТЗ §24.

Зависимости: PR2 (сервис + guest-токен).

## Новые API-роуты

`nextjs-project/src/app/api/checkout/session/route.ts`
- `POST` — вызывает `startCheckout()`. Тело: `{}` (весь контекст — brand из
  `resolveBrandOrDefaultFromRequest`, userId из сессии). Ответ: `{ sessionId }`,
  устанавливает cookie с guest-токеном (если гость).

`nextjs-project/src/app/api/checkout/session/[id]/contact/route.ts`
- `PATCH` — тело `{ fullName?, phone?, email? }`, валидация через новую zod-схему в
  `lib/validations/checkout-session.ts` (аналог `createOrderBodySchema`). Вызывает
  `updateCheckoutContact` + `trackCheckoutStep(..., 'CONTACT', 'CONTACT_ENTERED')`.

`nextjs-project/src/app/api/checkout/session/[id]/cart/route.ts`
- `PATCH` — тело: снимок корзины (товары, кол-во, цена, скидка, промокод, доставка,
  сумма — те же поля, что уже считаются на клиенте для `POST /api/orders`, просто
  раньше по времени и без создания заказа). Вызывает `updateCheckoutCart`.

`nextjs-project/src/app/api/checkout/session/[id]/delivery/route.ts`
- `PATCH` — тело `{ deliveryMethod, deliverySum? }`. Вызывает `trackCheckoutStep(...,
  'DELIVERY', 'DELIVERY_SELECTED')`.

`nextjs-project/src/app/api/checkout/session/[id]/promo/route.ts`
- `PATCH` — тело `{ promoCode }`. Вызывает `trackCheckoutStep(..., undefined,
  'PROMO_APPLIED')` (шаг не меняется, событие — да). Может переиспользовать логику
  `POST /api/promo/validate`, не дублировать проверку промокода — дергать существующий
  сервис из `services/promo.service.ts`.

Все PATCH-роуты: проверка владения через guest-cookie/userId (см. PR2), rate-limit по
образцу `checkRateLimit` из `POST /api/orders`.

## Клиентская сторона — `cart-page-content.tsx`

- При маунте страницы корзины (или при первом непустом состоянии корзины) —
  `POST /api/checkout/session`, сохранить `sessionId` в component state (не в
  zustand-сторе — это не персистентная бизнес-данная, а служебная для текущей вкладки).
- На `onBlur` полей телефона/email/имени (не на каждый `onChange`!) — debounce ~800мс →
  `PATCH .../contact`, только если поле прошло локальную валидацию
  (`validatePhoneRu`/`validateEmail`, которые уже есть в файле).
- При смене `deliveryMethod` (уже есть `useEffect`/handler на строке ~380–390 файла) —
  доп. вызов `PATCH .../delivery`.
- При успешном применении промокода (существующий `applyPromoCode`-путь) — доп. вызов
  `PATCH .../promo`.
- Периодически (debounce, не на каждый ререндер) синхронизировать снимок корзины —
  `PATCH .../cart`, когда меняется состав/количество товаров в `useCartStore`.
- Отправка не должна блокировать основной UX: `fetch(...).catch(() => {})`,
  fire-and-forget, ошибки трекинга не должны мешать оформлению заказа (это чисто
  наблюдаемость, не бизнес-логика).

## `POST /api/orders/route.ts` — точка стыковки с заказом

- Принимать опциональный `checkoutSessionId` в теле запроса (если фронт его знает).
- После успешного `orderService.createOrderWithItemsAndShipping(...)`:
  `trackCheckoutStep(sessionId, guestToken, 'ORDER_CREATED', 'ORDER_CREATED', {
  orderId })` + `linkOrder(sessionId, order.id)`.
- Если `checkoutSessionId` не пришёл (например, сработал adblock/ошибка сети раньше) —
  не блокировать создание заказа; можно best-effort создать сессию постфактум в статусе
  `ORDER_CREATED` с уже готовым orderId, но это второстепенный edge case, не
  критичный для MVP — фиксируется как известное ограничение, не решается в этом PR.
- Дальше, если для бренда настроена ЮKassa и создаётся платёж — событие
  `PAYMENT_INITIALIZATION_STARTED`/`PAYMENT_CREATED` уже относится к PR4.

## Что НЕ делать в этом PR

- Не менять контракт/обязательность полей `POST /api/orders` — он как принимал полный
  набор данных одним запросом, так и принимает; `checkoutSessionId` — опциональное
  поле для линковки, без него всё работает как раньше (обратная совместимость).
- Не отправлять `order_created`/`payment_*` события с клиента — это фиксируется только
  backend-стороной (см. `00-overview.md`, договорённость "frontend не источник
  истины").
- Не превращать `cart-page-content.tsx` в пошаговый wizard — UI остаётся
  одностраничным, трекинг работает "по факту заполнения полей", без изменения UX.

## Проверка

- Ручной прогон: открыть `/cart` с товарами → в БД появляется `CheckoutSession`
  (status ACTIVE, currentStep CART).
- Ввести телефон, не досылая форму → `phone` заполнен, событие `CONTACT_ENTERED` есть.
- Выбрать доставку → `currentStep = DELIVERY`, `lastCompletedStep = CONTACT`.
- Оформить заказ до конца → `orderId` проставлен, `currentStep = ORDER_CREATED`.
- Существующий happy path оформления заказа (без ошибок трекинга) не деградирует по
  времени ответа `POST /api/orders` заметно (трекинг — короткие точечные запросы, не
  блокирующие транзакцию создания заказа).
