import 'server-only'
import * as checkoutSessionService from '@/services/checkout-session.service'

/** Дефолт из ТЗ §10 (диапазон 30–60 мин) — берём консервативную верхнюю границу. */
export const DEFAULT_CHECKOUT_ABANDON_TIMEOUT_MINUTES = 60

export interface ScanAndMarkAbandonedCheckoutsParams {
  olderThanMinutes: number
  batchSize?: number
  /** Лимит на общее число обработанных сессий за один запуск (защита от зависания на большой таблице). */
  maxTotal?: number
}

export interface ScanAndMarkAbandonedCheckoutsResult {
  scanned: number
  markedAbandoned: number
}

const DEFAULT_BATCH_SIZE = 500
const DEFAULT_MAX_TOTAL = 20_000

/**
 * Помечает ACTIVE-сессии без активности дольше таймаута как ABANDONED, батчами —
 * чтобы один тик крона не завис на большой таблице (по аналогии с батчингом в
 * yookassa-sync-service). Идемпотентно: сессии не в статусе ACTIVE не трогает.
 */
export async function scanAndMarkAbandonedCheckouts(
  params: ScanAndMarkAbandonedCheckoutsParams
): Promise<ScanAndMarkAbandonedCheckoutsResult> {
  const batchSize = params.batchSize ?? DEFAULT_BATCH_SIZE
  const maxTotal = params.maxTotal ?? DEFAULT_MAX_TOTAL
  const olderThan = new Date(Date.now() - params.olderThanMinutes * 60 * 1000)

  let scanned = 0
  let markedAbandoned = 0

  for (;;) {
    if (scanned >= maxTotal) break

    const candidates = await checkoutSessionService.findStaleActiveSessions({
      olderThan,
      take: Math.min(batchSize, maxTotal - scanned),
    })
    if (candidates.length === 0) break

    scanned += candidates.length
    const ids = candidates.map((c) => c.id)
    const { count } = await checkoutSessionService.markSessionsAbandoned(ids)
    markedAbandoned += count

    await Promise.all(
      ids.map((id) => checkoutSessionService.createEvent(id, 'CHECKOUT_ABANDONED'))
    )

    if (candidates.length < batchSize) break
  }

  return { scanned, markedAbandoned }
}
