# Срез «бренд заказа» до `Order.brand` (фаза 0 плана 2026-05-04)

Краткая таблица: **файл / API → как определялся бренд для заказа** (эвристика по строкам: есть позиция с `Product.brand === 'sprint-power'` → витрина Sprint Power, иначе Inner). После фазы 1 источник истины — колонка `Order.brand`.

| Место | Логика |
|--------|--------|
| `nextjs-project/src/services/order.service.ts` — `findOrderBrandIdForNotify` | `OrderItem` → `product.brand`, любая строка `sprint-power` → `'sprint-power'`. |
| `order.service.ts` — `getOrdersForAdmin`, `getOrdersForAdminWithTrash` | Prisma `where`: `items.some.product.brand === sprint-power` vs `NOT` (для Inner). |
| `order.service.ts` — `getOrderDetailForAdmin` | После загрузки заказа: `items.some` по `product.brand` vs `brandId` из запроса админки. |
| `order.service.ts` — `getPendingOrdersWithYookassaPayment` | Тот же фильтр по `items` / `product.brand`. |
| `order.service.ts` — `createOrderWithItemsAndShipping` | `brandId` из параметров использовался для подарков/промо, **в `Order` не писался**. |
| `nextjs-project/src/app/api/orders/route.ts` POST | `resolveBrandOrDefaultFromRequest` → `brandId` для товаров, ЮKassa credentials, `createOrderWithItemsAndShipping`; платёж создаётся с учётными данными **витрины запроса**. |
| `nextjs-project/src/app/api/webhooks/yookassa/route.ts` | После разрешения `orderId`: `findOrderBrandIdForNotify` → ЮKassa/уведомления по credentials этого бренда. |
| `nextjs-project/src/app/api/admin/orders/[id]/yookassa-sync/route.ts` | Как webhook: `findOrderBrandIdForNotify(orderId)`. |
| `nextjs-project/src/app/api/admin/orders/yookassa-sync-bulk/route.ts` | Список кандидатов фильтруется по `brandId` из запроса; **одна** пара shopId/secret для всего батча (`assumedOrderBrandId` = бренд админки). |
| `nextjs-project/src/lib/order-paid-notifications.ts` | `findOrderBrandIdForNotify` для Telegram / MAX / почты после оплаты. |
| `nextjs-project/src/lib/cdek.ts` (создание/обновление отгрузки) | `findOrderBrandIdForNotify` → credentials СДЭК по бренду. |
| `nextjs-project/src/app/admin/page.tsx` (счётчик заказов в сводке) | `order.count` с `items.some.product.brand` по активному бренду админки. |
| ЛК `account.service` список заказов | Бренд заказа **не** отдавался отдельным полем (фаза 4 плана). |

**ЮKassa при создании заказа:** `brandId` из запроса витрины → `getYookassaSettingsMap({ brandId })` — согласовано с витриной; webhook не передаёт бренд, но находит заказ по `metadata`/id и восстанавливает бренд через состав (до фазы 1) / через `Order.brand` (после фазы 1).
