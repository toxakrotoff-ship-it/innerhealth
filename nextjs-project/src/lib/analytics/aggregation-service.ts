import 'server-only'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const ANALYTICS_EVENT_KEEP_LAST_DAYS = (() => {
  const raw = Number(process.env.ANALYTICS_EVENT_KEEP_LAST_DAYS ?? '7')
  return Number.isFinite(raw) && raw >= 0 ? raw : 7
})()

const FUNNEL_STEPS = [
  { step: 'PAGE_VIEW' as const, next: 'CART_ADD' as const },
  { step: 'CART_ADD' as const, next: 'CHECKOUT_START' as const },
  { step: 'CHECKOUT_START' as const, next: 'ORDER_CREATED' as const },
  { step: 'ORDER_CREATED' as const },
]

function getDateRangeForDay(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

function getAnalyticsDeletionCutoff(now: Date): Date {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - ANALYTICS_EVENT_KEEP_LAST_DAYS)
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

export async function aggregateTrafficForDate(date: Date): Promise<void> {
  const { start, end } = getDateRangeForDay(date)

  const pageViewsByPath = await prisma.analyticsEvent.groupBy({
    by: ['brand', 'path'],
    where: {
      occurredAt: { gte: start, lt: end },
      type: 'PAGE_VIEW',
    },
    _count: {
      _all: true,
    },
  })

  const clicksByPath = await prisma.analyticsEvent.groupBy({
    by: ['brand', 'path'],
    where: {
      occurredAt: { gte: start, lt: end },
      type: 'CLICK',
    },
    _count: {
      _all: true,
    },
  })

  const sessionsByPathRaw = await prisma.$queryRaw<
    Array<{ brand: string; path: string | null; cnt: bigint }>
  >(
    Prisma.sql`
      SELECT
        "brand",
        "path",
        COUNT(DISTINCT COALESCE("sessionId", "anonId", "id"))::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE "occurredAt" >= ${start} AND "occurredAt" < ${end}
        AND type = 'PAGE_VIEW'::"AnalyticsEventType"
      GROUP BY "brand", "path"
    `
  )

  const pageViewMap = new Map<string, number>()
  for (const row of pageViewsByPath) {
    pageViewMap.set(`${row.brand}:${row.path ?? ''}`, row._count._all)
  }

  const clickMap = new Map<string, number>()
  for (const row of clicksByPath) {
    clickMap.set(`${row.brand}:${row.path ?? ''}`, row._count._all)
  }

  const sessionsMap = new Map<string, number>()
  for (const row of sessionsByPathRaw) {
    sessionsMap.set(`${row.brand}:${row.path ?? ''}`, Number(row.cnt))
  }

  const upsertKeys = new Set<string>([
    ...Array.from(pageViewMap.keys()),
    ...Array.from(clickMap.keys()),
    ...Array.from(sessionsMap.keys()),
  ])

  await prisma.$transaction(
    Array.from(upsertKeys).map((key) => {
      const [brand, ...pathParts] = key.split(':')
      const path = pathParts.join(':')
      const normalizedPath = path.length > 0 ? path : null
      const pageViews = pageViewMap.get(key) ?? 0
      const clicks = clickMap.get(key) ?? 0
      // Сессии считаем как количество уникальных sessionId / anonId среди PAGE_VIEW.
      // Fallback на id события не должен срабатывать на нормальных данных,
      // но защищает от ситуации, когда событие пришло без идентификаторов.
      const sessions = sessionsMap.get(key) ?? pageViews

      return prisma.dailyTrafficStats.upsert({
        where: {
          brand_date_path: {
            brand,
            date: start,
            path: normalizedPath,
          },
        },
        create: {
          brand,
          date: start,
          path: normalizedPath,
          pageViews,
          sessions,
          clicks,
        },
        update: {
          pageViews,
          sessions,
          clicks,
        },
      })
    })
  )

  await upsertDailyDeviceStatsForDay(start, end)
}

async function upsertDailyDeviceStatsForDay(start: Date, end: Date): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ brand: string; kind: string; cnt: bigint }>>(
    Prisma.sql`
      SELECT
        "brand",
        COALESCE(meta->>'deviceType', 'unknown') AS kind,
        COUNT(*)::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE "occurredAt" >= ${start} AND "occurredAt" < ${end}
        AND type = 'PAGE_VIEW'::"AnalyticsEventType"
      GROUP BY "brand", COALESCE(meta->>'deviceType', 'unknown')
    `
  )

  const perBrand = new Map<
    string,
    { desktop: number; mobile: number; tablet: number; unknown: number }
  >()

  for (const row of rows) {
    const n = Number(row.cnt)
    const current = perBrand.get(row.brand) ?? {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    }
    switch (row.kind) {
      case 'desktop':
        current.desktop += n
        break
      case 'mobile':
        current.mobile += n
        break
      case 'tablet':
        current.tablet += n
        break
      default:
        current.unknown += n
        break
    }
    perBrand.set(row.brand, current)
  }

  await prisma.$transaction(
    Array.from(perBrand.entries()).map(([brand, stats]) =>
      prisma.dailyDeviceStats.upsert({
        where: {
          brand_date: {
            brand,
            date: start,
          },
        },
        create: {
          brand,
          date: start,
          desktop: stats.desktop,
          mobile: stats.mobile,
          tablet: stats.tablet,
          unknown: stats.unknown,
        },
        update: {
          desktop: stats.desktop,
          mobile: stats.mobile,
          tablet: stats.tablet,
          unknown: stats.unknown,
        },
      })
    )
  )
}

export async function aggregateFunnelForDate(date: Date): Promise<void> {
  const { start, end } = getDateRangeForDay(date)

  const counts = await prisma.analyticsEvent.groupBy({
    by: ['brand', 'type'],
    where: {
      occurredAt: { gte: start, lt: end },
    },
    _count: {
      _all: true,
    },
  })

  const map = new Map<string, number>()
  const brands = new Set<string>()
  for (const row of counts) {
    brands.add(row.brand)
    map.set(`${row.brand}:${row.type}`, row._count._all)
  }

  await prisma.$transaction(
    Array.from(brands).flatMap((brand) =>
      FUNNEL_STEPS.map(({ step, next }) => {
        const count = map.get(`${brand}:${step}`) ?? 0
        const nextCount = next ? map.get(`${brand}:${next}`) ?? 0 : 0
        const conversionToNext =
          next && count > 0 ? Math.min(1, nextCount / count) : null

        return prisma.dailyFunnelStats.upsert({
          where: {
            brand_date_step: {
              brand,
              date: start,
              step,
            },
          },
          create: {
            brand,
            date: start,
            step,
            count,
            conversionToNext,
          },
          update: {
            count,
            conversionToNext,
          },
        })
      })
    )
  )
}

export async function aggregateForDateRange(
  from: Date,
  to: Date
): Promise<void> {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  const deletionCutoff = getAnalyticsDeletionCutoff(new Date())

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    // Клонируем, чтобы транзакции не портили счётчик.
    const day = new Date(cursor)
    const { start: dayStart, end: dayEnd } = getDateRangeForDay(day)
    await aggregateTrafficForDate(day)
    await aggregateFunnelForDate(day)

    // После агрегации удаляем сырые события для дней старше ретенции,
    // чтобы таблица `AnalyticsEvent` не разрасталась и не забивала SSD.
    if (dayEnd <= deletionCutoff) {
      await prisma.analyticsEvent.deleteMany({
        where: {
          occurredAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      })
    }
  }
}

