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

  const events = await prisma.analyticsEvent.groupBy({
    by: ['path'],
    where: {
      occurredAt: { gte: start, lt: end },
    },
    _count: {
      _all: true,
    },
  })

  await prisma.$transaction(
    events.map((row) =>
      prisma.dailyTrafficStats.upsert({
        where: {
          date_path: {
            date: start,
            path: row.path ?? null,
          },
        },
        create: {
          date: start,
          path: row.path ?? null,
          pageViews: row._count._all,
          sessions: row._count._all,
          clicks: 0,
        },
        update: {
          pageViews: row._count._all,
          sessions: row._count._all,
        },
      })
    )
  )

  await upsertDailyDeviceStatsForDay(start, end)
}

async function upsertDailyDeviceStatsForDay(start: Date, end: Date): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ kind: string; cnt: bigint }>>(
    Prisma.sql`
      SELECT COALESCE(meta->>'deviceType', 'unknown') AS kind, COUNT(*)::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE "occurredAt" >= ${start} AND "occurredAt" < ${end}
        AND type = 'PAGE_VIEW'::"AnalyticsEventType"
      GROUP BY COALESCE(meta->>'deviceType', 'unknown')
    `
  )

  let desktop = 0
  let mobile = 0
  let tablet = 0
  let unknown = 0

  for (const row of rows) {
    const n = Number(row.cnt)
    switch (row.kind) {
      case 'desktop':
        desktop += n
        break
      case 'mobile':
        mobile += n
        break
      case 'tablet':
        tablet += n
        break
      default:
        unknown += n
        break
    }
  }

  await prisma.dailyDeviceStats.upsert({
    where: { date: start },
    create: {
      date: start,
      desktop,
      mobile,
      tablet,
      unknown,
    },
    update: {
      desktop,
      mobile,
      tablet,
      unknown,
    },
  })
}

export async function aggregateFunnelForDate(date: Date): Promise<void> {
  const { start, end } = getDateRangeForDay(date)

  const counts = await prisma.analyticsEvent.groupBy({
    by: ['type'],
    where: {
      occurredAt: { gte: start, lt: end },
    },
    _count: {
      _all: true,
    },
  })

  const map = new Map<string, number>()
  for (const row of counts) {
    map.set(row.type, row._count._all)
  }

  await prisma.$transaction(
    FUNNEL_STEPS.map(({ step, next }) => {
      const count = map.get(step) ?? 0
      const nextCount = next ? map.get(next) ?? 0 : 0
      const conversionToNext =
        next && count > 0 ? Math.min(1, nextCount / count) : null

      return prisma.dailyFunnelStats.upsert({
        where: {
          date_step: {
            date: start,
            step,
          },
        },
        create: {
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
    // eslint-disable-next-line no-await-in-loop
    await aggregateTrafficForDate(day)
    // eslint-disable-next-line no-await-in-loop
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

