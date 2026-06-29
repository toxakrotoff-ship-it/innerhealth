import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const FUNNEL_STEP_ORDER = [
  'PAGE_VIEW',
  'CART_ADD',
  'CHECKOUT_START',
  'ORDER_CREATED',
] as const

export type FunnelStepKey = (typeof FUNNEL_STEP_ORDER)[number]

export const FUNNEL_STEPS_WITH_NEXT = [
  { step: 'PAGE_VIEW' as const, next: 'CART_ADD' as const },
  { step: 'CART_ADD' as const, next: 'CHECKOUT_START' as const },
  { step: 'CHECKOUT_START' as const, next: 'ORDER_CREATED' as const },
  { step: 'ORDER_CREATED' as const },
] as const

export function computeConversionToNext(
  count: number,
  nextCount: number | undefined
): number | null {
  if (nextCount === undefined) return null
  if (count <= 0) return null
  return nextCount / count
}

interface FunnelCountRow {
  brand: string
  step: string
  cnt: bigint
}

/**
 * Считает шаги воронки по уникальным посетителям (sessionId/anonId).
 * ORDER_CREATED — по уникальным orderId из meta, чтобы не дублировать webhook + return.
 */
export async function fetchDistinctFunnelCounts(params: {
  start?: Date
  end?: Date
  brand?: string
  occurredAtGte?: Date
  occurredAtLte?: Date
}): Promise<Map<string, number>> {
  const { start, end, brand, occurredAtGte, occurredAtLte } = params

  const rows = await prisma.$queryRaw<FunnelCountRow[]>(
    Prisma.sql`
      SELECT
        "brand",
        type::text AS step,
        COUNT(DISTINCT
          CASE
            WHEN type = 'ORDER_CREATED'::"AnalyticsEventType"
              THEN COALESCE(meta->>'orderId', "sessionId", "anonId", id)
            ELSE COALESCE("sessionId", "anonId", id)
          END
        )::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE type = ANY(ARRAY[
        'PAGE_VIEW'::"AnalyticsEventType",
        'CART_ADD'::"AnalyticsEventType",
        'CHECKOUT_START'::"AnalyticsEventType",
        'ORDER_CREATED'::"AnalyticsEventType"
      ])
      ${start ? Prisma.sql`AND "occurredAt" >= ${start}` : Prisma.empty}
      ${end ? Prisma.sql`AND "occurredAt" < ${end}` : Prisma.empty}
      ${occurredAtGte ? Prisma.sql`AND "occurredAt" >= ${occurredAtGte}` : Prisma.empty}
      ${occurredAtLte ? Prisma.sql`AND "occurredAt" <= ${occurredAtLte}` : Prisma.empty}
      ${brand ? Prisma.sql`AND "brand" = ${brand}` : Prisma.empty}
      GROUP BY "brand", type
    `
  )

  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(`${row.brand}:${row.step}`, Number(row.cnt))
  }
  return map
}

export function buildFunnelStatsFromCounts(params: {
  brand: string
  date: Date
  counts: Map<string, number>
}): Array<{
  date: Date
  step: FunnelStepKey
  count: number
  conversionToNext: number | null
}> {
  const { brand, date, counts } = params

  return FUNNEL_STEP_ORDER.map((step, index) => {
    const count = counts.get(`${brand}:${step}`) ?? 0
    const next = FUNNEL_STEP_ORDER[index + 1]
    const nextCount = next ? counts.get(`${brand}:${next}`) ?? 0 : undefined
    return {
      date,
      step,
      count,
      conversionToNext: computeConversionToNext(count, nextCount),
    }
  })
}
