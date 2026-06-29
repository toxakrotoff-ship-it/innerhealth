import 'server-only'

import type { BrandId } from '@/lib/brand/brand'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { createAnalyticsEvent } from '@/lib/analytics/analytics-event-service'
import { prisma } from '@/lib/prisma'

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
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { createdAt: true },
  })

  await createAnalyticsEvent({
    type: 'ORDER_CREATED',
    path: '/cart',
    brand: resolveAnalyticsBrand(brandId),
    // Привязываем к дню оформления, а не к моменту webhook — иначе воронка «ломается» по дням.
    occurredAt: order?.createdAt ?? new Date(),
    meta: { orderId, source: 'payment_confirmed' },
  })
}
