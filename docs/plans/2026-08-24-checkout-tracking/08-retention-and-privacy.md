# PR8 — Privacy whitelist и retention

## Цель

Закрыть требования ТЗ §26–27: не хранить чувствительные данные в `metadata`, дать
техническую возможность автоматической анонимизации/удаления старых записей.

Зависимости: PR1–PR5 (все точки, откуда пишется `metadata`, уже существуют и должны
быть приведены к единому whitelisting-механизму, а не переписаны заново).

## Централизованный whitelist

Новый файл `nextjs-project/src/lib/checkout-event-metadata.ts`:

```ts
// Явные аллоу-листы полей на источник, а не блок-лист — безопаснее по умолчанию
const YOOKASSA_ERROR_FIELDS = ['id', 'status', 'cancellation_details'] as const
const YOOKASSA_CANCELLATION_FIELDS = ['party', 'reason'] as const

export function buildPaymentProviderErrorMetadata(raw: YookassaCancellationDetails): PaymentProviderError {
  // явно берёт только party/reason, никогда весь raw-объект
}

export function buildPaymentCallbackMetadata(raw: YookassaPaymentObject): Record<string, unknown> {
  // только id, status; НЕ include: payment_method (может содержать маскированный
  // номер карты/токен), confirmation, receipt, metadata пользователя из ЮKassa
}
```

Ревизия всех мест из PR2–PR4, которые пишут `metadata` в `trackCheckoutError`/
`trackPaymentCallback`/`trackCheckoutEvent` — заменить любой прямой
`JSON.stringify(payload)`/spread целого объекта на вызов через эти builder-функции.
Это ретроактивный аудит-проход по коду, добавленному в предыдущих PR, а не новая
инфраструктура с нуля — в PR2–PR4 whitelisting уже закладывается как обязательное
требование, PR8 фиксирует его отдельным явным модулем + тестом-страховкой (ниже).

**Явный запрет-лист** (для теста-страховки, не как основной механизм):
номер карты/PAN, CVV/CVC, `payment_method.card`, любые поля с `token`/`secret`/
`password`/`authorization`/`cookie` в названии — тест в PR9 грепает по этим паттернам
все `metadata`, записанные в интеграционных тестах.

## Retention

- Добавить на `CheckoutSession` (миграция в этом PR, не в PR1 — чтобы PR1 оставался
  чисто структурным) поле `anonymizedAt DateTime?` — по нему легко фильтровать уже
  обработанные записи, не завязываясь на `deletedAt`-как-у-Order (там другой смысл —
  мягкое удаление заказа целиком, здесь — только зачистка PII при сохранении
  бизнес-метрик).
- Management-скрипт `nextjs-project/scripts/anonymize-old-checkout-sessions.ts` (по
  прямому образцу `scripts/cleanup-auth-tokens.ts`):
  ```ts
  // для сессий с createdAt старше N дней (env CHECKOUT_RETENTION_DAYS, дефолт не
  // задаём в коде намертво — оставляем configurable, конкретный срок ТЗ §27 явно
  // отдаёт на решение бизнеса/юристов отдельно от разработки):
  //   - fullName/phone/email -> null
  //   - cartSnapshot остаётся (не PII, нужен для funnel-аналитики по товарам)
  //   - guestToken -> null (токен доступа гостя не нужен для анонимной записи)
  //   - anonymizedAt = now()
  // COMPLETED-сессии, у которых есть orderId, не трогать чаще, чем позволяет
  // retention-политика для самих Order/ShippingInfo (если у Order есть своя PII
  // retention — не создавать рассинхрон между заказом и его checkout-сессией)
  ```
- Запуск — вручную или через тот же cron-механизм, что PR5 (отдельный
  `api/cron/checkout-anonymize` **не обязателен** для MVP — скрипт можно гонять как
  разовый/периодический management-таск, как `cleanup-auth-tokens.ts` сегодня;
  добавить HTTP cron-обёртку только если бизнес попросит автоматизацию раньше, чем
  будет фактическая retention-политика).
- Явно не проставлять хардкод срока — комментарий в коде и в этом файле: "точный срок
  retention определяется отдельно с бизнесом/юристами (ТЗ §27), скрипт готов к
  использованию с любым значением через env".

## Индексы — финальный проход

После PR6 (реальные admin-queryset) — проверить `EXPLAIN` на:
- `listSessionsForAdmin` с типичным фильтром (`brand + status + lastActivityAt`,
  уже покрыт индексом из PR1) — если появятся частые составные фильтры
  (например `brand + hasOrder`), рассмотреть частичный индекс
  `@@index([brand, orderId])` точечно, не заранее.
- Поиск по `phone`/`email` — уже покрыт одиночными индексами из PR1; если объём
  вырастет и понадобится `contains`-поиск с приемлемой скоростью — рассмотреть
  `pg_trgm`-индекс отдельным PR по факту реальной нагрузки, не сейчас.

## Что НЕ делать в этом PR

- Не удалять `CheckoutSession` целиком по retention (ТЗ §12 — checkout-сессии не
  удаляются, чтобы не потерять аналитику по успешным/неуспешным путям) — только
  анонимизация PII-полей, структура и факт события остаются.
- Не жёстко фиксировать срок retention в коде без возможности его поменять — ТЗ §27
  явно откладывает конкретное число на отдельное решение.

## Проверка

- Тест: `buildPaymentCallbackMetadata` на объекте с полем `payment_method.card` не
  включает его в результат.
- Тест-страховка (грепом по всем местам вызова `trackCheckoutError`/
  `trackPaymentCallback` в кодовой базе, или через snapshot записанных в тестах
  `metadata`) — ни одно поле не матчит `/card|cvv|token|secret|password|authoriz/i`.
- Прогон `anonymize-old-checkout-sessions.ts` на тестовых данных: PII обнулены,
  `cartSnapshot`/статистика полей остаются нетронутыми.
