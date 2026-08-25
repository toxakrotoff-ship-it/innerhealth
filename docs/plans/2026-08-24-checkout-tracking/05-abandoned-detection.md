# PR5 — Фоновая задача определения abandoned checkout

## Цель

Периодически помечать `CheckoutSession` как `ABANDONED`, если активности не было
дольше таймаута и итог ещё не известен (ТЗ §10). Без новой инфраструктуры — по образцу
существующего крон-поллера ЮKassa.

Зависимости: PR4 (нужен статус `ACTIVE` и корректно проставляемые
`PAYMENT_FAILED`/`COMPLETED`/`PAYMENT_CANCELLED`, чтобы не пометить abandoned то, что
уже имеет другой финальный статус).

## Новые файлы

`nextjs-project/src/app/api/cron/checkout-abandon-scan/route.ts`
- `GET`/`POST`, авторизация заголовком `x-cron-token` === `process.env
  .CHECKOUT_ABANDON_SCAN_TOKEN` (отдельный от `YOOKASSA_POLL_TOKEN` env, тот же паттерн
  проверки, что в `api/cron/yookassa-poll/route.ts`).
- Вызывает `scanAndMarkAbandonedCheckouts({ olderThanMinutes: 60, batchSize: 500 })` из
  нового `nextjs-project/src/lib/checkout-abandon-scan-service.ts`.

`nextjs-project/src/lib/checkout-abandon-scan-service.ts`
```ts
export async function scanAndMarkAbandonedCheckouts(params: {
  olderThanMinutes: number
  batchSize?: number
}): Promise<{ scanned: number; markedAbandoned: number }>
```
Логика (по образцу `syncPendingOrdersBatch`):
```sql
WHERE status = 'ACTIVE'
  AND lastActivityAt < now() - interval 'N minutes'
```
Для каждой найденной сессии — `checkout-session.service.updateSessionStatus(id,
'ABANDONED')` + `trackCheckoutEvent(id, 'CHECKOUT_ABANDONED', currentStep)`, батчами
(`take: batchSize`, повтор пока не пусто или лимит на один запуск), чтобы один тик
крона не завис на большой таблице — прямая аналогия с `since/take` в
`syncPendingOrdersBatch`.

`nextjs-project/deploy/ops/checkout-abandon-scan.sh`
- Bash-обёртка, копия `deploy/ops/yookassa-poll.sh` с заменой URL/токена, добавляется
  в VPS crontab (задокументировать в `deploy/ops/README.md`), интервал — раз в 5–10
  минут (не обязательно раз в минуту, как у платежей — abandoned detection не
  критична по задержке в пределах нескольких минут).

## Таймаут

- Значение по умолчанию — **60 минут** без активности (верхняя граница из
  рекомендованного в ТЗ §10 диапазона 30–60 — берём консервативную верхнюю, чтобы не
  помечать abandoned пользователей, которые просто медленно заполняют форму или
  отвлеклись на реальную оплату в банковском приложении). Вынести как env
  `CHECKOUT_ABANDON_TIMEOUT_MINUTES` с дефолтом 60, не хардкодить — бизнес может
  захотеть потюнить без деплоя кода.
- Сессии с `currentStep` в `PAYMENT_REDIRECT`/`PAYMENT_PROCESSING` (то есть уже дошли
  до оплаты) — тот же общий таймаут; отдельного более короткого окна для этой стадии в
  MVP не делаем (ТЗ не требует дифференциации, п.10 даёт единый диапазон), но
  оставляем комментарий в коде, что это settable отдельно, если бизнес попросит.

## Возвращение пользователя (ТЗ §11)

Реализуется не в cron, а в `touchActivity()` из PR2 (`checkout-session.service.ts`),
вызываемом из каждого PATCH-эндпоинта PR3 и из `startCheckout` при повторном визите:

```ts
async function touchActivity(id: string) {
  const session = await prisma.checkoutSession.findUnique({ where: { id } })
  if (!session) return
  const wasAbandoned = session.status === 'ABANDONED'
  await prisma.checkoutSession.update({
    where: { id },
    data: {
      lastActivityAt: new Date(),
      ...(wasAbandoned ? { status: 'ACTIVE' } : {}),
    },
  })
  if (wasAbandoned) {
    await createEvent(id, 'CHECKOUT_REACTIVATED')
  }
}
```

Событие `CHECKOUT_ABANDONED`, созданное cron-задачей ранее, **не удаляется** — новое
событие `CHECKOUT_REACTIVATED` просто добавляется в timeline (ТЗ §11 — явное
требование не терять историю). Финальные статусы (`COMPLETED`, `PAYMENT_FAILED`,
`PAYMENT_CANCELLED`, `EXPIRED`) не реактивируются через `touchActivity` — если
пользователь вернулся после `PAYMENT_FAILED` и начинает заново, это должно создать
новую попытку (`startCheckout` не переиспользует сессию в терминальном статусе — эта
логика уже описана в PR2).

## Что НЕ делать в этом PR

- Не заводить Celery/BullMQ/новую очередь — используется тот же HTTP+cron паттерн, что
  уже в проекте для ЮKassa (прямое требование ТЗ §10: "если в проекте уже используется
  очередь/background workers — использовать существующий механизм").
- Не помечать abandoned сессии, у которых уже есть терминальный статус — cron-запрос
  фильтрует `status = 'ACTIVE'`, `COMPLETED`/`PAYMENT_FAILED`/`PAYMENT_CANCELLED` не
  трогает.
- Не удалять/архивировать данные в этом PR — abandoned detection только меняет
  `status`, retention — отдельный PR8.

## Проверка

- Интеграционный тест: сессия с `lastActivityAt = now() - 90min`, `status = ACTIVE` →
  после запуска `scanAndMarkAbandonedCheckouts({ olderThanMinutes: 60 })` становится
  `ABANDONED`, событие `CHECKOUT_ABANDONED` создано.
- Тест: сессия с `status = COMPLETED` и такой же старой `lastActivityAt` — не
  затронута.
- Тест: повторный вызов `touchActivity` на уже `ABANDONED` сессии переводит в `ACTIVE`
  и создаёт `CHECKOUT_REACTIVATED`, старое событие `CHECKOUT_ABANDONED` остаётся в
  таблице.
- Smoke: cron-эндпоинт без корректного `x-cron-token` → 401/403, не выполняет скан.
