# PR7 — Админка: карточка checkout + timeline + человеко-читаемые причины

## Цель

По клику на строку списка (PR6) открыть подробную карточку с клиентом, корзиной,
checkout-состоянием, платежом, заказом и timeline событий, с понятной менеджеру
формулировкой причины (ТЗ §15–17).

Зависимости: PR6 (список, откуда переход), PR1–PR5 (данные).

## Новые файлы

- `nextjs-project/src/app/admin/checkout-sessions/[id]/page.tsx` — карточка
- `nextjs-project/src/app/api/admin/checkout-sessions/[id]/route.ts` — `GET`, отдаёт
  сессию + `events` (сортированные по `createdAt`) + связанный `order` (если есть,
  минимальный набор полей: `orderNumber`, `status`, ссылка), с той же
  brand-проверкой, что и в PR6 (404, если сессия принадлежит другой витрине —
  не 403, чтобы не подтверждать существование чужого id).

## Секции карточки (ТЗ §16)

- **Клиент**: `fullName`, `phone`, `email` (или "не указано" для отсутствующих —
  явно, не пустая строка), `userId` (ссылка на `/admin/users/{id}` если есть) или
  бейдж "Гость".
- **Корзина**: рендер `cartSnapshot` — таблица Название/Вариант/Кол-во/Цена/Скидка/
  Итог, снизу — Промокод, Доставка (метод + стоимость), Итоговая сумма
  (`cartTotal`).
- **Checkout**: Начат (`createdAt`), Последняя активность (`lastActivityAt`), Текущий
  этап и Последний завершённый этап — человеко-читаемые лейблы (см. ниже), Статус —
  бейдж.
- **Платёж** (если `paymentId` есть): Provider, Payment ID, статус, последний
  callback (последнее событие `PAYMENT_CALLBACK_RECEIVED`), ошибка — из последнего
  `PAYMENT_FAILED`/`PAYMENT_PROVIDER_ERROR` события (code + человеко-читаемый message).
- **Заказ** (если `orderId` есть): № заказа, статус, ссылка на `/admin/orders/{id}`
  (существующая страница, без изменений).
- **Timeline**: список `CheckoutEvent`, время + человеко-читаемое описание типа
  события + (для ошибок) code/message на отдельной строке; кнопка/accordion
  "Показать техническую информацию" раскрывает `metadata` как есть (JSON, для
  разработчика/техподдержки).
- Кнопки "Позвонить"/"Написать email" — простые `tel:`/`mailto:` ссылки рядом с
  контактами (ТЗ §21 — без интеграции телефонии/почты, просто ссылки).

## Человеко-читаемая причина (ТЗ §15)

Новый файл `nextjs-project/src/lib/checkout-session-reason.ts`:

```ts
export function getCheckoutReason(session: CheckoutSessionWithEvents): string {
  // приоритет: явная ошибка > терминальный статус > застрявший шаг
  const lastError = findLastErrorEvent(session.events) // PAYMENT_FAILED | API_ERROR | VALIDATION_ERROR | PAYMENT_PROVIDER_ERROR

  if (session.status === 'PAYMENT_FAILED' && lastError) {
    return `Ошибка оплаты: ${describeProviderError(lastError.metadata)}`
  }
  if (session.status === 'PAYMENT_CANCELLED') {
    return 'Оплата отменена'
  }
  if (session.status === 'COMPLETED') {
    return 'Оформление завершено'
  }
  if (lastError?.eventType === 'API_ERROR') {
    return `Ошибка checkout API: ${lastError.metadata?.message ?? ''}`
  }

  switch (session.currentStep) {
    case 'CART': return 'Не указал контактные данные'
    case 'CONTACT': return 'Указал контакты, но не выбрал доставку'
    case 'DELIVERY': return 'Выбрал доставку, но не подтвердил заказ'
    case 'CONFIRMATION': return 'Подтвердил, но заказ не создан'
    case 'ORDER_CREATED': return 'Заказ создан, но не перешёл к оплате'
    case 'PAYMENT_INITIALIZATION':
    case 'PAYMENT_CREATED':
    case 'PAYMENT_REDIRECT':
    case 'PAYMENT_PROCESSING':
      return 'Перешёл к оплате, но не завершил её'
    default: return 'Не продолжил оформление'
  }
}
```

`describeProviderError(metadata)` — маппинг известных `code` (из `normalizeYookassaError`
в PR4) на короткие русские формулировки ("Банк отклонил платёж", "Недостаточно
средств" и т.п.), с fallback на `metadata.message` как есть, если код неизвестен.
Raw provider message показывается отдельно, ниже, как техническая деталь (ТЗ §15 —
"raw error можно показывать ниже отдельно").

Эта же функция используется в компактном виде для колонки "Причина" в списке (PR6) —
не дублировать логику, импортировать из `checkout-session-reason.ts`.

## Timeline — лейблы событий

Словарь `CheckoutEventType → русский лейбл` (ТЗ §17, пример "18:03 Checkout начат",
"18:06 Выбрана доставка" и т.д.) — простой `Record<CheckoutEventType, string>` в том же
файле или соседнем `checkout-event-labels.ts`.

## Что НЕ делать в этом PR

- Не пытаться редактировать данные сессии из карточки (это read-only
  наблюдательность, ТЗ не просит редактирование).
- Не показывать полный `metadata` в основном виде timeline — только в
  раскрываемом accordion, чтобы не перегружать менеджера техническими деталями (ТЗ
  §17 прямо это требует).
- Не тянуть в карточку данные другого бренда даже при прямом переходе по URL с чужим
  `id` — 404 при brand-mismatch.

## Проверка

- Ручной прогон сценариев 1–5 из ТЗ §35: для каждого — карточка показывает ожидаемые
  поля и текст причины дословно близкий к примерам ТЗ.
- Timeline отображает события в хронологическом порядке с читаемыми лейблами;
  accordion с raw `metadata` не показывает чувствительных полей (см. PR8).
