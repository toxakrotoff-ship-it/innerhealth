# PR1 — Data model: CheckoutSession / CheckoutEvent

## Цель

Завести Prisma-модели для хранения состояния незавершённых оформлений, независимо от
факта создания `Order`. Чисто аддитивная миграция — ничего в существующих моделях не
меняется.

Зависимости: нет (первый PR).

## Модели (в `nextjs-project/prisma/schema.prisma`, рядом с `Order`/`AnalyticsEvent`)

```prisma
model CheckoutSession {
  id               String              @id @default(cuid())
  brand            String              @default("inner")

  // идентификация
  userId           String?
  guestToken       String?             @unique   // opaque токен для гостя, см. PR2
  anonId           String?                        // необязательный линк на AnalyticsEvent.anonId

  // контакты (сохраняются по мере ввода, не только в конце)
  fullName         String?
  phone            String?
  email            String?

  // snapshot корзины на момент последнего изменения (не история, только последнее состояние)
  cartSnapshot     Json?
  cartItemsCount   Int                 @default(0)
  cartTotal        Decimal?            @db.Decimal(10, 2)
  promoCode        String?
  deliveryMethod   String?
  deliverySum      Decimal?            @db.Decimal(10, 2)

  // состояние
  currentStep      CheckoutStep        @default(CART)
  lastCompletedStep CheckoutStep?
  status           CheckoutStatus      @default(ACTIVE)

  // связь с результатом
  orderId          String?             @unique
  order            Order?              @relation(fields: [orderId], references: [id], onDelete: SetNull)

  // платёж (денормализовано для быстрого списка в админке; источник истины — события)
  paymentProvider  String?
  paymentId        String?
  paymentStatus    String?

  createdAt        DateTime            @default(now())
  lastActivityAt   DateTime            @default(now())
  completedAt      DateTime?

  events           CheckoutEvent[]

  @@index([status])
  @@index([createdAt])
  @@index([lastActivityAt])
  @@index([brand])
  @@index([brand, status, lastActivityAt])
  @@index([phone])
  @@index([email])
  @@index([userId])
}

model CheckoutEvent {
  id                String            @id @default(cuid())
  checkoutSessionId String
  checkoutSession   CheckoutSession   @relation(fields: [checkoutSessionId], references: [id], onDelete: Cascade)

  eventType         CheckoutEventType
  step              CheckoutStep?
  metadata          Json?             // whitelisted payload, см. PR8 (privacy)

  createdAt         DateTime          @default(now())

  @@index([checkoutSessionId, createdAt])
  @@index([eventType, createdAt])
}

enum CheckoutStep {
  CART
  CONTACT
  DELIVERY
  CONFIRMATION
  ORDER_CREATED
  PAYMENT_INITIALIZATION
  PAYMENT_CREATED
  PAYMENT_REDIRECT
  PAYMENT_PROCESSING
  COMPLETED
}

enum CheckoutStatus {
  ACTIVE
  ABANDONED
  PAYMENT_FAILED
  PAYMENT_CANCELLED
  COMPLETED
  EXPIRED
}

enum CheckoutEventType {
  CHECKOUT_STARTED
  CONTACT_ENTERED
  DELIVERY_SELECTED
  PROMO_APPLIED
  ORDER_CREATED
  PAYMENT_INITIALIZATION_STARTED
  PAYMENT_CREATED
  PAYMENT_REDIRECTED
  PAYMENT_CALLBACK_RECEIVED
  PAYMENT_SUCCEEDED
  PAYMENT_FAILED
  PAYMENT_CANCELLED
  CHECKOUT_COMPLETED
  CHECKOUT_ABANDONED
  CHECKOUT_REACTIVATED
  VALIDATION_ERROR
  API_ERROR
  PAYMENT_PROVIDER_ERROR
}
```

На `Order` добавить обратную сторону связи (не обязательное поле, просто relation):

```prisma
model Order {
  // ...существующие поля без изменений...
  checkoutSession  CheckoutSession?
}
```

## Дизайн-решения и почему

- **`orderId` на `CheckoutSession`, а не наоборот** — чтобы не трогать модель `Order`
  добавлением nullable-полей, которые почти всегда `null` (у заказов, оформленных до
  выката фичи, вообще не будет `CheckoutSession`). `onDelete: SetNull` — если заказ
  когда-то физически удалят (мягкое удаление через `deletedAt` этого не касается),
  история checkout не должна пропасть.
- **`cartSnapshot: Json` + денормализованные `cartItemsCount`/`cartTotal`** — денорм.
  поля нужны для быстрой отрисовки списка в админке без парсинга JSON на каждой
  строке (ТЗ §14 — таблица с колонками "Корзина" и "Сумма"). Полная история каждого
  изменения корзины не хранится (ТЗ §4 явно говорит, что это не обязательно) — только
  последний снимок.
- **`CheckoutStatus` отдельно от `CheckoutStep`** — статус описывает "как кончилось"
  (активен / брошен / ошибка платежа / отменён / завершён / истёк), шаг — "где
  остановился". Это разделение прямо из ТЗ §5 (`current_step` / `status` — разные
  измерения).
- **`guestToken` как отдельное уникальное поле**, а не переиспользование `id` — id
  используется в admin URL и как FK, `guestToken` — то, что уходит в httpOnly cookie
  клиенту и не должно быть тем же значением, что публично видно в URL карточки
  админки (defense in depth, см. PR2 §"Гостевая идентификация").
- **Денормализованные `paymentProvider/paymentId/paymentStatus`** — чтобы список в
  админке (ТЗ §14, фильтр "есть созданный платёж") не требовал JOIN/сканирования
  событий на каждый рендер строки; источник истины по факту — `CheckoutEvent` с
  `PAYMENT_*` типами (PR4).
- **Индексы** — по прямому списку из ТЗ §33 (`status`, `createdAt`, `lastActivityAt`,
  `brand/storefront`, `phone`, `email`) + один составной `(brand, status,
  lastActivityAt)` под самый частый admin-запрос "список активных/abandoned по
  витрине, свежие сверху" и под cron-скан из PR5. Остальные составные — по факту
  реальных queryset после PR6, не заранее.

## Что НЕ делать в этом PR

- Не добавлять `abandoned_cart` или похожие статусы в `Order`.
- Не хранить raw provider payload в `CheckoutEvent.metadata` — это будет
  зафиксировано в PR8, но структура `Json?` уже сейчас предполагает whitelist, а не
  дамп.
- Не создавать вторую модель корзины — `cartSnapshot` не заменяет `CartItem`
  (которая и так не используется в checkout-flow) и не пытается стать источником
  истины для остатков/резервирования.

## Проверка

- `npx prisma migrate dev` создаёт миграцию без предупреждений о потере данных.
- `npx prisma generate` проходит, типы `CheckoutSession`/`CheckoutEvent` доступны в
  `@prisma/client`.
- Существующие тесты и типы проекта (`npm run typecheck` / `tsc --noEmit`) не ломаются.
