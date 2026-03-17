import 'server-only'

import { prisma } from '@/lib/prisma'

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

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    // Клонируем, чтобы транзакции не портили счётчик.
    const day = new Date(cursor)
    // eslint-disable-next-line no-await-in-loop
    await aggregateTrafficForDate(day)
    // eslint-disable-next-line no-await-in-loop
    await aggregateFunnelForDate(day)
  }
}

