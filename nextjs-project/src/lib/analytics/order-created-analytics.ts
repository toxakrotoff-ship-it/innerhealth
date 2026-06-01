import 'server-only'

import type { BrandId } from '@/lib/brand/brand'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { createAnalyticsEvent } from '@/lib/analytics/analytics-event-service'

function resolveAnalyticsBrand(brandId: BrandId): 'inner' | 'sprint-power' {
  return isSprintPowerBrand(brandId) ? 'sprint-power' : 'inner'
}

/**
 * Записывает ORDER_CREATED после подтверждённой оплаты (webhook / sync / cron).
 * Идемпотентно по orderId в meta — повторные переходы в paid не дублируют событие.
 */
export async function recordOrderCreatedAnalyticsEvent(
  orderId: string,
  brandId: BrandId
): Promise<void> {
  await createAnalyticsEvent({
    type: 'ORDER_CREATED',
    path: '/cart',
    brand: resolveAnalyticsBrand(brandId),
    occurredAt: new Date(),
    meta: { orderId, source: 'payment_confirmed' },
  })
}
