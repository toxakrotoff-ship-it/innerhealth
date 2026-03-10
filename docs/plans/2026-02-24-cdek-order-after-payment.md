# CDEK: создание заказа на отгрузку после оплаты — план реализации

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** После успешной оплаты заказа автоматически создавать заказ на отгрузку в СДЭК для доставок «до ПВЗ» и «до двери»; при ошибке — retry, затем флаг и кнопка в админке для повтора.

**Architecture:** Явные поля в Order (cdekOrderUuid, cdekOrderError) и ShippingInfo (deliveryMethod, cdekCityCode, cdekPvzCode, cdekTariffCode, структурированный адрес). Корзина передаёт данные СДЭК и doorAddress; webhook при payment.succeeded вызывает createCdekOrder с retry; админка — настройки отправителя и кнопка «Создать отгрузку в СДЭК» с API.

**Tech Stack:** Next.js App Router, Prisma, Zod, СДЭК API v2 (https://apidoc.cdek.ru/).

**Design reference:** [2026-02-24-cdek-order-after-payment-design.md](./2026-02-24-cdek-order-after-payment-design.md)

---

## Task 1: Миграция Prisma — поля Order и ShippingInfo

**Files:**
- Modify: `nextjs-project/prisma/schema.prisma` (модели Order, ShippingInfo)

**Step 1: Добавить поля в schema.prisma**

В модели `Order` добавить после `yookassaPaymentId`:
```prisma
  /// UUID заказа в СДЭК после успешного создания
  cdekOrderUuid   String?  @unique
  /// Последнее сообщение об ошибке СДЭК (для админки и повтора)
  cdekOrderError  String?
```

В модели `ShippingInfo` добавить после `country`:
```prisma
  /// 'cdek_pvz' | 'cdek_door' | null
  deliveryMethod  String?
  /// Код города СДЭК получателя
  cdekCityCode    Int?
  /// Код ПВЗ (для cdek_pvz)
  cdekPvzCode     String?
  /// Код тарифа СДЭК (136, 139, 234 и т.д.)
  cdekTariffCode  Int?
  /// Адрес до двери (структурированный)
  street          String?
  house           String?
  apartment       String?
  entrance        String?
  floor           String?
  intercom        String?
```

**Step 2: Создать и применить миграцию**

Run: `cd nextjs-project && npx prisma migrate dev --name add_cdek_order_and_shipping_fields`
Expected: миграция создана и применена, Prisma Client сгенерирован.

**Step 3: Commit**

```bash
git add nextjs-project/prisma/schema.prisma nextjs-project/prisma/migrations/
git commit -m "feat(cdek): add Order/ShippingInfo fields for CDEK shipment"
```

---

## Task 2: Валидация заказа — приём deliveryMethod, СДЭК-полей, doorAddress

**Files:**
- Modify: `nextjs-project/src/lib/validations/order.ts`

**Step 1: Расширить shippingSchema и createOrderBodySchema**

В `order.ts` добавить опциональную схему для структурированного адреса и расширить shipping и body:

```ts
const doorAddressSchema = z.object({
  street: z.string().max(200).trim().optional(),
  house: z.string().max(50).trim().optional(),
  apartment: z.string().max(50).trim().optional(),
  entrance: z.string().max(50).trim().optional(),
  floor: z.string().max(20).trim().optional(),
  intercom: z.string().max(50).trim().optional(),
}).optional();

// В shippingSchema добавить опциональные поля (после country):
// deliveryMethod, cdekCityCode, cdekPvzCode, cdekTariffCode, doorAddress
```

Конкретно: в `shippingSchema` добавить:
- `deliveryMethod: z.enum(['cdek_pvz', 'cdek_door']).nullable().optional()`
- `cdekCityCode: z.number().int().positive().nullable().optional()`
- `cdekPvzCode: z.string().max(50).nullable().optional()`
- `cdekTariffCode: z.number().int().positive().nullable().optional()`
- `doorAddress: doorAddressSchema`

В `createOrderBodySchema` поле `shipping` уже использует `shippingSchema` — после расширения схемы новые поля будут приниматься.

**Step 2: Проверить сборку**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка без ошибок типов.

**Step 3: Commit**

```bash
git add nextjs-project/src/lib/validations/order.ts
git commit -m "feat(orders): validate deliveryMethod, CDEK fields, doorAddress"
```

---

## Task 3: API заказа — сохранение СДЭК и структурированного адреса в ShippingInfo

**Files:**
- Modify: `nextjs-project/src/app/api/orders/route.ts` (транзакция создания ShippingInfo)

**Step 1: В транзакции при создании ShippingInfo передавать новые поля**

В `tx.shippingInfo.create` добавить в `data` (из `parsed.data.shipping` или из `shipping`):
- `deliveryMethod: shipping.deliveryMethod ?? undefined`
- `cdekCityCode: shipping.cdekCityCode ?? undefined`
- `cdekPvzCode: shipping.cdekPvzCode ?? undefined`
- `cdekTariffCode: shipping.cdekTariffCode ?? undefined`
- `street`, `house`, `apartment`, `entrance`, `floor`, `intercom` из `shipping.doorAddress` (если есть)

Если при `deliveryMethod === 'cdek_door'` передан `doorAddress`, сформировать `address` одной строкой из полей (street, house, apartment, …), если текущий `address` пустой или нужно перезаписать.

Убедиться, что тип `CreateOrderBody` и тип `shipping` включают новые поля (они появятся из zod infer после Task 2).

**Step 2: Проверить сборку**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка.

**Step 3: Commit**

```bash
git add nextjs-project/src/app/api/orders/route.ts
git commit -m "feat(orders): persist CDEK and door address fields in ShippingInfo"
```

---

## Task 4: Корзина — передача deliveryMethod, СДЭК-данных и doorAddress в POST /api/orders

**Files:**
- Modify: `nextjs-project/src/components/site/cart-page-content.tsx` (handleSubmitOrder, body JSON)

**Step 1: В body запроса добавить поля shipping**

В `handleSubmitOrder` в объект `shipping` (который отправляется в `body.shipping`) добавить:
- `deliveryMethod`: значение из state `deliveryMethod` (если это `'cdek_pvz'` или `'cdek_door'`, иначе не передавать или null).
- При СДЭК: `cdekCityCode: cityCode`, `cdekTariffCode`: из `pvzTariff?.tariffCode` или `doorTariff?.tariffCode` в зависимости от метода; при ПВЗ — `cdekPvzCode: selectedPvz?.code`.
- При `deliveryMethod === 'cdek_door'`: `doorAddress: { street: doorAddress.street, house: doorAddress.house, apartment: doorAddress.apartment, entrance: doorAddress.entrance, floor: doorAddress.floor, intercom: doorAddress.intercom }`.

Проверить, что `cityCode` и тарифы доступны в момент submit (уже есть в компоненте).

**Step 2: Проверить сборку**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка.

**Step 3: Commit**

```bash
git add nextjs-project/src/components/site/cart-page-content.tsx
git commit -m "feat(cart): send CDEK and door address to order API"
```

---

## Task 5: Настройки админки — поля отправителя СДЭК

**Files:**
- Modify: `nextjs-project/src/app/admin/settings/page.tsx` (FIELDS, группа cdek)
- Modify: `nextjs-project/src/app/api/admin/settings/route.ts` (SETTING_KEYS)

**Step 1: Добавить ключи настроек отправителя**

В `route.ts` в `SETTING_KEYS` добавить: `cdek_sender_name`, `cdek_sender_phone`, `cdek_sender_address`, `cdek_from_city_code` (если ещё не используется общий CDEK_FROM_CITY_CODE — можно один ключ для города отправления).

В `page.tsx` в массив `FIELDS` для группы `cdek` добавить:
- `cdek_sender_name` (text), `cdek_sender_phone` (text), `cdek_sender_address` (text), `cdek_from_city_code` (text, placeholder "Код города отправления СДЭК").

**Step 2: Проверить загрузку/сохранение**

Запустить приложение, открыть Настройки → Доставка (СДЭК), убедиться, что новые поля отображаются и сохраняются.

**Step 3: Commit**

```bash
git add nextjs-project/src/app/admin/settings/page.tsx nextjs-project/src/app/api/admin/settings/route.ts
git commit -m "feat(admin): CDEK sender settings (name, phone, address, city code)"
```

---

## Task 6: Функция createCdekOrder в src/lib/cdek.ts

**Files:**
- Modify: `nextjs-project/src/lib/cdek.ts`
- Reference: https://apidoc.cdek.ru/ (раздел создания заказа)

**Step 1: Реализовать createCdekOrder**

- Сигнатура: `createCdekOrder(orderId: string): Promise<{ uuid: string } | { error: string }>`.
- Внутри: `prisma.order.findUnique` с `include: { items: { include: { product: true } }, shippingInfo: true }`. Если заказа нет или нет shippingInfo или deliveryMethod не `cdek_pvz`/`cdek_door` — вернуть `{ error: '...' }`.
- Загрузить настройки отправителя из SiteSetting (cdek_sender_name, cdek_sender_phone, cdek_sender_address, cdek_from_city_code) с fallback на env (CDEK_SENDER_NAME, CDEK_SENDER_PHONE, CDEK_SENDER_ADDRESS, CDEK_FROM_CITY_CODE).
- Собрать пакеты: по items вызвать productToCdekPackage для каждого товара (габариты из product), затем mergeCdekPackages. Получить from_location из кода города отправления (настройки или CDEK_FROM_CITY_CODE).
- Для получателя: fullName, phone, email из shippingInfo. Для «до двери» — to_location с адресом из street, house, apartment и т.д. (формат по API СДЭК). Для ПВЗ — to_location с кодом ПВЗ (delivery_point).
- Тариф: shippingInfo.cdekTariffCode. Номер заказа: orderId.
- Вызвать POST на `getCdekApiBase()/orders` (или актуальный endpoint из apidoc.cdek.ru) с Bearer-токеном от getCdekToken(), body — JSON по документации СДЭК.
- При успехе (201/200 и uuid в ответе) вернуть `{ uuid }`. При ошибке — поймать, залогировать, вернуть `{ error: message }`.

Точную структуру body запроса взять из актуальной документации СДЭК (https://apidoc.cdek.ru/). Типичные поля: type=1, tariff_code, from_location, to_location, recipient, sender, packages, number (внешний номер заказа).

**Step 2: Проверить сборку**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка.

**Step 3: Commit**

```bash
git add nextjs-project/src/lib/cdek.ts
git commit -m "feat(cdek): add createCdekOrder for shipment registration"
```

---

## Task 7: Webhook ЮKassa — вызов createCdekOrder при оплате, retry, запись cdekOrderUuid / cdekOrderError

**Files:**
- Modify: `nextjs-project/src/app/api/webhooks/yookassa/route.ts`

**Step 1: После перевода заказа в paid вызвать createCdekOrder с retry**

После `prisma.order.update(..., { status: 'paid' })`:
- Загрузить заказ снова с shippingInfo (или один раз до update загрузить с include shippingInfo).
- Если shippingInfo?.deliveryMethod не 'cdek_pvz' и не 'cdek_door' — ничего не делать по СДЭК.
- Если у заказа уже есть cdekOrderUuid — не вызывать СДЭК.
- Иначе: цикл retry (например 3 попытки, задержка 2–3 сек между попытками). Вызвать createCdekOrder(orderId). При успехе — prisma.order.update({ where: { id: orderId }, data: { cdekOrderUuid: result.uuid, cdekOrderError: null } }). При ошибке после всех попыток — prisma.order.update({ ..., data: { cdekOrderError: lastError } }). Логировать каждую попытку и результат.

Важно: не возвращать 500 из webhook при ошибке СДЭК — всегда возвращать 200 после обработки payment.succeeded (заказ уже помечен paid).

**Step 2: Проверить сборку**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка.

**Step 3: Commit**

```bash
git add nextjs-project/src/app/api/webhooks/yookassa/route.ts
git commit -m "feat(webhook): create CDEK order on payment.succeeded with retry"
```

---

## Task 8: API админки POST /api/admin/orders/[id]/cdek-shipment

**Files:**
- Create: `nextjs-project/src/app/api/admin/orders/[id]/cdek-shipment/route.ts`

**Step 1: Реализовать POST handler**

- Проверка сессии (getServerSession, authOptions); если нет — 401.
- Получить orderId из params. Загрузить заказ с shippingInfo. Проверить: status === 'paid', deliveryMethod in ['cdek_pvz','cdek_door'], cdekOrderUuid отсутствует (или разрешить повтор — тогда не проверять отсутствие uuid, а вызывать создание только если uuid нет).
- Вызвать createCdekOrder(orderId). При успехе — обновить заказ (cdekOrderUuid, cdekOrderError = null), вернуть JSON { success: true, uuid }. При ошибке — обновить cdekOrderError, вернуть 502 или 200 с { success: false, error: message }.

**Step 2: Проверить сборку**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка.

**Step 3: Commit**

```bash
git add nextjs-project/src/app/api/admin/orders/[id]/cdek-shipment/route.ts
git commit -m "feat(admin): API to create CDEK shipment for paid order"
```

---

## Task 9: Админка заказов — отображение СДЭК и кнопка «Создать отгрузку в СДЭК»

**Files:**
- Modify: `nextjs-project/src/app/admin/orders/page.tsx`
- Modify: `nextjs-project/src/app/api/admin/orders/route.ts` (если нужно — select уже включает shippingInfo)

**Step 1: Расширить тип Order и ShippingInfo**

В интерфейсах добавить: Order — `cdekOrderUuid`, `cdekOrderError`, `status` (чтобы показывать paid). ShippingInfo — `deliveryMethod`, `cdekCityCode`, `cdekPvzCode`, `cdekTariffCode`, при необходимости структурированный адрес.

**Step 2: В блоке «Доставка» расширенного ряда показать СДЭК-статус и кнопку**

В разметке внутри `expandedId === order.id`: под блоком «Доставка» добавить блок «СДЭК»:
- Если есть cdekOrderUuid — текст «Заказ СДЭК: <uuid>» (или ссылка в ЛК СДЭК при наличии).
- Если есть cdekOrderError — текст «Ошибка СДЭК: …» (cdekOrderError).
- Кнопка «Создать отгрузку в СДЭК» показывать только если: status === 'paid', (deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door'), нет cdekOrderUuid. По клику: POST `/api/admin/orders/${order.id}/cdek-shipment`, при успехе обновить локальный state заказов (добавить uuid в заказ и убрать ошибку) и при необходимости перезапросить список; при ошибке показать alert или inline сообщение.

**Step 3: Добавить в statusLabel значение 'paid'**

В `statusLabel` добавить: `paid: 'Оплачен'`.

**Step 4: Проверить сборку и отображение**

Run: `cd nextjs-project && npm run build`
Expected: успешная сборка. Вручную: зайти в админку → Заказы, раскрыть оплаченный заказ с доставкой СДЭК — должна отображаться кнопка и/или статус СДЭК.

**Step 5: Commit**

```bash
git add nextjs-project/src/app/admin/orders/page.tsx
git commit -m "feat(admin): show CDEK status and Create CDEK shipment button on orders"
```

---

## Task 10: Документация и env

**Files:**
- Modify: `docs/step_3_yokassa|cdek.md` (раздел про авто-создание заказа СДЭК)
- Modify: `docs/env's.md` (переменные CDEK_SENDER_* и cdek_from_city_code при наличии)

**Step 1: Описать авто-создание заказа в СДЭК и настройки отправителя**

В step_3_yokassa|cdek.md добавить подраздел: при переходе заказа в «Оплачен» для доставок СДЭК (до ПВЗ / до двери) автоматически создаётся заказ на отгрузку в СДЭК; при ошибке — несколько повторов, затем в админке доступна кнопка «Создать отгрузку в СДЭК». Настройки отправителя: Настройки сайта → Доставка (СДЭК) — имя, телефон, адрес, код города отправления; при необходимости переопределение через env CDEK_SENDER_NAME, CDEK_SENDER_PHONE, CDEK_SENDER_ADDRESS, CDEK_FROM_CITY_CODE.

**Step 2: В env's.md добавить переменные**

Указать опциональные CDEK_SENDER_NAME, CDEK_SENDER_PHONE, CDEK_SENDER_ADDRESS и напомнить про CDEK_FROM_CITY_CODE для города отправления.

**Step 3: Commit**

```bash
git add docs/step_3_yokassa\|cdek.md docs/env's.md
git commit -m "docs: CDEK order creation after payment and sender env vars"
```

---

## Execution

После выполнения плана: провести ручное тестирование (оформление заказа с СДЭК до ПВЗ и до двери, оплата тестовой картой, проверка webhook и кнопки в админке). При необходимости уточнить формат тела запроса к СДЭК по актуальной версии API на https://apidoc.cdek.ru/.
