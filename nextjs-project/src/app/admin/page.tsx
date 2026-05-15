import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AdminDatePicker } from './components/AdminDatePicker'
import { AdminStatsPeriodPresets } from './components/AdminStatsPeriodPresets'
import { AdminStatsRefreshButton } from './components/AdminStatsRefreshButton'
import { buildFallbackTrafficRowsByPath } from './admin-stats-helpers'
import type { BrandId } from '@/lib/brand/brand'
import { resolveAdminBrand, ACTIVE_BRAND_COOKIE_NAME, ADMIN_BRAND_COOKIE_NAME } from '@/lib/brand/brand-context'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

export const dynamic = 'force-dynamic'

type PeriodKey = '7d' | '30d' | '90d' | 'all'
type PageSortKey = 'path' | 'pageViews' | 'clicks' | 'ctr'
type SortDirection = 'asc' | 'desc'

function resolvePeriod(period: string | undefined): PeriodKey {
  if (period === '7d' || period === '30d' || period === '90d' || period === 'all') {
    return period
  }
  return '30d'
}

function resolvePageSortKey(value: string | undefined): PageSortKey {
  if (value === 'path' || value === 'pageViews' || value === 'clicks' || value === 'ctr') {
    return value
  }
  return 'pageViews'
}

function resolveSortDirection(value: string | undefined): SortDirection {
  if (value === 'asc' || value === 'desc') {
    return value
  }
  return 'desc'
}

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const d = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateInputValue(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(
  period: PeriodKey,
  customFrom?: string,
  customTo?: string
): { from?: Date; to?: Date; isCustom: boolean } {
  const fromDate = parseDateParam(customFrom)
  const toDate = parseDateParam(customTo)

  if (fromDate && toDate && fromDate <= toDate) {
    toDate.setHours(23, 59, 59, 999)
    return { from: fromDate, to: toDate, isCustom: true }
  }

  if (period === 'all') return { isCustom: false }
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setHours(0, 0, 0, 0)
  if (period === '7d') from.setDate(from.getDate() - 6)
  if (period === '30d') from.setDate(from.getDate() - 29)
  if (period === '90d') from.setDate(from.getDate() - 89)
  return { from, to, isCustom: false }
}

interface DeviceStats {
  desktop: number
  mobile: number
  tablet: number
  other: number
}

interface PageStat {
  path: string
  pageViews: number
  clicks: number
}

interface PageStatWithCtr extends PageStat {
  ctr: number | null
}

interface FunnelStat {
  date: Date
  step: string
  count: number
  conversionToNext: number | null
}

interface FunnelDateGroup {
  dateKey: string
  rows: FunnelStat[]
}

async function getSummary(
  period: PeriodKey,
  activeBrand: BrandId,
  customFrom?: string,
  customTo?: string
) {
  const anyPrisma = prisma as unknown as {
    dailyTrafficStats?: {
      aggregate: (args: unknown) => Promise<{
        _sum: { pageViews: number | null; sessions: number | null; clicks: number | null }
      }>
    }
    dailyFunnelStats?: {
      findMany: (args: unknown) => Promise<
        Array<{
          date: Date
          step: string
          count: number
          conversionToNext: number | null
        }>
      >
    }
    analyticsEvent?: {
      count: (args: unknown) => Promise<number>
      groupBy: (args: unknown) => Promise<
        Array<{
          path?: string | null
          type?: string
          _count: { _all: number }
        }>
      >
    }
    order: {
      count: (args: unknown) => Promise<number>
    }
  }

  const hasAnalytics =
    anyPrisma.dailyTrafficStats !== undefined &&
    anyPrisma.dailyFunnelStats !== undefined

  if (!hasAnalytics) {
    return {
      trafficTotal: { _sum: { pageViews: 0, sessions: 0, clicks: 0 } },
      funnelTotal: [] as FunnelStat[],
      ordersCount: 0,
      pageStats: [] as PageStat[],
      deviceStats: { desktop: 0, mobile: 0, tablet: 0, other: 0 } as DeviceStats,
    }
  }

  const { from, to } = getDateRange(period, customFrom, customTo)

  const dateWhere = from && to
    ? { gte: from, lte: to }
    : undefined

  const [trafficAggregate, funnelAggregate, ordersCount, deviceAggregate] = await Promise.all([
    anyPrisma.dailyTrafficStats.aggregate({
      where: dateWhere ? { brand: activeBrand, date: dateWhere } : { brand: activeBrand },
      _sum: { pageViews: true, sessions: true, clicks: true },
    }),
    anyPrisma.dailyFunnelStats.findMany({
      where: dateWhere ? { brand: activeBrand, date: dateWhere } : { brand: activeBrand },
      orderBy: { date: 'desc' },
      take: 90,
    }),
    anyPrisma.order.count({
      where: {
        ...(dateWhere ? { createdAt: dateWhere } : {}),
        brand: isSprintPowerBrand(activeBrand) ? 'sprint-power' : 'inner',
      },
    }),
    prisma.dailyDeviceStats.aggregate({
      where: dateWhere ? { brand: activeBrand, date: dateWhere } : { brand: activeBrand },
      _sum: {
        desktop: true,
        mobile: true,
        tablet: true,
        unknown: true,
      },
    }),
  ])

  const aggregateHasTrafficData =
    (trafficAggregate._sum.pageViews ?? 0) > 0 ||
    (trafficAggregate._sum.sessions ?? 0) > 0 ||
    (trafficAggregate._sum.clicks ?? 0) > 0
  const aggregateHasFunnelData = funnelAggregate.length > 0

  const sumD = deviceAggregate._sum.desktop ?? 0
  const sumM = deviceAggregate._sum.mobile ?? 0
  const sumT = deviceAggregate._sum.tablet ?? 0
  const sumU = deviceAggregate._sum.unknown ?? 0
  const sumAgg = sumD + sumM + sumT + sumU

  let deviceStats: DeviceStats

  if (sumAgg > 0) {
    deviceStats = {
      desktop: sumD,
      mobile: sumM,
      tablet: sumT,
      other: sumU,
    }
  } else if (anyPrisma.analyticsEvent) {
    const [deviceDesktop, deviceMobile, deviceTablet, totalPageViews] = await Promise.all([
      anyPrisma.analyticsEvent.count({
        where: {
          type: 'PAGE_VIEW',
          brand: activeBrand,
          occurredAt: dateWhere,
          meta: {
            path: ['deviceType'],
            equals: 'desktop',
          },
        },
      }),
      anyPrisma.analyticsEvent.count({
        where: {
          type: 'PAGE_VIEW',
          brand: activeBrand,
          occurredAt: dateWhere,
          meta: {
            path: ['deviceType'],
            equals: 'mobile',
          },
        },
      }),
      anyPrisma.analyticsEvent.count({
        where: {
          type: 'PAGE_VIEW',
          brand: activeBrand,
          occurredAt: dateWhere,
          meta: {
            path: ['deviceType'],
            equals: 'tablet',
          },
        },
      }),
      anyPrisma.analyticsEvent.count({
        where: {
          type: 'PAGE_VIEW',
          brand: activeBrand,
          occurredAt: dateWhere,
        },
      }),
    ])
    deviceStats = {
      desktop: deviceDesktop,
      mobile: deviceMobile,
      tablet: deviceTablet,
      other: Math.max(0, totalPageViews - deviceDesktop - deviceMobile - deviceTablet),
    }
  } else {
    deviceStats = { desktop: 0, mobile: 0, tablet: 0, other: 0 }
  }

  const trafficRowsFromAggregate = anyPrisma.dailyTrafficStats
    ? await (anyPrisma.dailyTrafficStats as unknown as {
        findMany: (args: unknown) => Promise<
          Array<{
            date: Date
            path: string | null
            pageViews: number
            clicks: number
          }>
        >
      }).findMany({
        where: dateWhere ? { brand: activeBrand, date: dateWhere } : { brand: activeBrand },
        select: {
          date: true,
          path: true,
          pageViews: true,
          clicks: true,
        },
      })
    : []

  const hasTrafficRowsFromAggregate = trafficRowsFromAggregate.length > 0

  let trafficTotal = trafficAggregate
  let funnelTotal = funnelAggregate
  let trafficRows = trafficRowsFromAggregate

  // Каждая часть статистики имеет независимый fallback на сырые события.
  // Это важно: иначе пустая воронка перекрывает уже агрегированный трафик и
  // длинный период (90 дней) показывает меньше, чем короткий (30 дней),
  // потому что сырые события хранятся ограниченное время (ANALYTICS_EVENT_KEEP_LAST_DAYS).
  const needTrafficTotalFallback = !aggregateHasTrafficData
  const needFunnelFallback = !aggregateHasFunnelData
  const needPathRowsFallback = !hasTrafficRowsFromAggregate

  if (
    anyPrisma.analyticsEvent &&
    (needTrafficTotalFallback || needFunnelFallback || needPathRowsFallback)
  ) {
    const [
      totalPageViewsRaw,
      totalClicksRaw,
      pageViewByPathRaw,
      clickByPathRaw,
      funnelByTypeRaw,
    ] = await Promise.all([
      needTrafficTotalFallback
        ? anyPrisma.analyticsEvent.count({
            where: {
              type: 'PAGE_VIEW',
              brand: activeBrand,
              occurredAt: dateWhere,
            },
          })
        : Promise.resolve(0),
      needTrafficTotalFallback
        ? anyPrisma.analyticsEvent.count({
            where: {
              type: 'CLICK',
              brand: activeBrand,
              occurredAt: dateWhere,
            },
          })
        : Promise.resolve(0),
      needPathRowsFallback
        ? anyPrisma.analyticsEvent.groupBy({
            by: ['path'],
            where: {
              type: 'PAGE_VIEW',
              brand: activeBrand,
              occurredAt: dateWhere,
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as Array<{ path?: string | null; _count: { _all: number } }>),
      needPathRowsFallback
        ? anyPrisma.analyticsEvent.groupBy({
            by: ['path'],
            where: {
              type: 'CLICK',
              brand: activeBrand,
              occurredAt: dateWhere,
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as Array<{ path?: string | null; _count: { _all: number } }>),
      needFunnelFallback
        ? anyPrisma.analyticsEvent.groupBy({
            by: ['type'],
            where: {
              type: { in: ['PAGE_VIEW', 'CART_ADD', 'CHECKOUT_START', 'ORDER_CREATED'] },
              brand: activeBrand,
              occurredAt: dateWhere,
            },
            _count: { _all: true },
          })
        : Promise.resolve([] as Array<{ type?: string; _count: { _all: number } }>),
    ])

    if (needTrafficTotalFallback) {
      // Уникальные сессии: count(distinct sessionId|anonId) среди PAGE_VIEW.
      // Если идентификаторов нет — fallback к самому событию (id), чтобы не нулить колонку.
      const sessionsRows = await prisma.$queryRaw<Array<{ cnt: bigint }>>(
        Prisma.sql`
          SELECT COUNT(DISTINCT COALESCE("sessionId", "anonId", "id"))::bigint AS cnt
          FROM "AnalyticsEvent"
          WHERE type = 'PAGE_VIEW'::"AnalyticsEventType"
            AND "brand" = ${activeBrand}
            ${dateWhere ? Prisma.sql`AND "occurredAt" >= ${dateWhere.gte} AND "occurredAt" <= ${dateWhere.lte}` : Prisma.empty}
        `
      )
      const sessionsRaw = sessionsRows.length > 0 ? Number(sessionsRows[0].cnt) : 0
      trafficTotal = {
        _sum: {
          pageViews: totalPageViewsRaw,
          sessions: sessionsRaw,
          clicks: totalClicksRaw,
        },
      }
    }

    if (needPathRowsFallback) {
      trafficRows = buildFallbackTrafficRowsByPath({
        from,
        pageViewByPathRows: pageViewByPathRaw,
        clickByPathRows: clickByPathRaw,
      })
    }

    if (needFunnelFallback) {
      const funnelMap = new Map<string, number>()
      for (const row of funnelByTypeRaw) {
        if (!row.type) continue
        funnelMap.set(row.type, row._count._all)
      }

      const funnelSteps: Array<'PAGE_VIEW' | 'CART_ADD' | 'CHECKOUT_START' | 'ORDER_CREATED'> = [
        'PAGE_VIEW',
        'CART_ADD',
        'CHECKOUT_START',
        'ORDER_CREATED',
      ]

      funnelTotal = funnelSteps.map((step, index) => {
        const count = funnelMap.get(step) ?? 0
        const next = funnelSteps[index + 1]
        const nextCount = next ? funnelMap.get(next) ?? 0 : 0
        const conversionToNext = next && count > 0 ? Math.min(1, nextCount / count) : null
        return {
          date: from ?? new Date(),
          step,
          count,
          conversionToNext,
        }
      })
    }
  }

  const pageMap = new Map<string, PageStat>()
  for (const row of trafficRows) {
    const key = row.path ?? '(без пути)'
    const prev = pageMap.get(key) ?? { path: key, pageViews: 0, clicks: 0 }
    prev.pageViews += row.pageViews
    prev.clicks += row.clicks
    pageMap.set(key, prev)
  }

  const pageStats = Array.from(pageMap.values()).sort((a, b) => b.pageViews - a.pageViews)

  return { trafficTotal, funnelTotal, ordersCount, pageStats, deviceStats }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const getFunnelStepLabel = (step: string): string => {
    const stepLabels: Record<string, string> = {
      PAGE_VIEW: 'Просмотр страницы',
      CART_ADD: 'Добавление в корзину',
      CHECKOUT_START: 'Начало оформления',
      ORDER_CREATED: 'Заказ создан',
    }
    return stepLabels[step] ?? step
  }

  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {}
  const periodParam =
    typeof resolvedSearchParams.period === 'string'
      ? resolvedSearchParams.period
      : Array.isArray(resolvedSearchParams.period)
        ? resolvedSearchParams.period[0]
        : undefined

  const fromParam =
    typeof resolvedSearchParams.from === 'string'
      ? resolvedSearchParams.from
      : Array.isArray(resolvedSearchParams.from)
        ? resolvedSearchParams.from[0]
        : undefined

  const toParam =
    typeof resolvedSearchParams.to === 'string'
      ? resolvedSearchParams.to
      : Array.isArray(resolvedSearchParams.to)
        ? resolvedSearchParams.to[0]
        : undefined

  const sortParam =
    typeof resolvedSearchParams.sort === 'string'
      ? resolvedSearchParams.sort
      : Array.isArray(resolvedSearchParams.sort)
        ? resolvedSearchParams.sort[0]
        : undefined

  const dirParam =
    typeof resolvedSearchParams.dir === 'string'
      ? resolvedSearchParams.dir
      : Array.isArray(resolvedSearchParams.dir)
        ? resolvedSearchParams.dir[0]
        : undefined

  const pagesParam =
    typeof resolvedSearchParams.pages === 'string'
      ? resolvedSearchParams.pages
      : Array.isArray(resolvedSearchParams.pages)
        ? resolvedSearchParams.pages[0]
        : undefined

  const period = resolvePeriod(periodParam)
  const pageSortKey = resolvePageSortKey(sortParam)
  const sortDirection = resolveSortDirection(dirParam)
  const showAllPageStats = pagesParam === 'all'

  const headerStore = await headers()
  const cookieStore = await cookies()
  const activeBrand = resolveAdminBrand({
    forwardedBrand: headerStore.get('x-brand'),
    adminBrandCookie: cookieStore.get(ADMIN_BRAND_COOKIE_NAME)?.value ?? null,
    activeBrandCookie: cookieStore.get(ACTIVE_BRAND_COOKIE_NAME)?.value ?? null,
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })

  const adminBasePath = `/${process.env.ADMIN_SECRET_PATH ?? 'admin'}/${activeBrand}`

  const { from, to, isCustom } = getDateRange(period, fromParam, toParam)
  const { trafficTotal, funnelTotal, ordersCount, pageStats, deviceStats } = await getSummary(period, activeBrand, fromParam, toParam)
  const pageStatsWithCtr: PageStatWithCtr[] = pageStats.map((row) => ({
    ...row,
    ctr: row.pageViews > 0 ? Math.round((row.clicks / row.pageViews) * 100) : null,
  }))
  const sortedPageStats = [...pageStatsWithCtr].sort((left, right) => {
    const factor = sortDirection === 'asc' ? 1 : -1

    if (pageSortKey === 'path') {
      return left.path.localeCompare(right.path, 'ru', { sensitivity: 'base' }) * factor
    }

    const leftValue = pageSortKey === 'ctr' ? (left.ctr ?? -1) : left[pageSortKey]
    const rightValue = pageSortKey === 'ctr' ? (right.ctr ?? -1) : right[pageSortKey]

    if (leftValue !== rightValue) {
      return (leftValue - rightValue) * factor
    }

    return left.path.localeCompare(right.path, 'ru', { sensitivity: 'base' })
  })
  const visiblePageStats = showAllPageStats ? sortedPageStats : sortedPageStats.slice(0, 5)
  const hasHiddenPageStats = sortedPageStats.length > 5
  const funnelByDate = funnelTotal.reduce<FunnelDateGroup[]>((acc, row) => {
    const dateKey = row.date.toISOString().slice(0, 10)
    const lastGroup = acc.length > 0 ? acc[acc.length - 1] : undefined
    if (lastGroup && lastGroup.dateKey === dateKey) {
      lastGroup.rows.push(row)
      return acc
    }

    acc.push({
      dateKey,
      rows: [row],
    })
    return acc
  }, [])
  const tableSearchParams = new URLSearchParams()
  if (periodParam) tableSearchParams.set('period', periodParam)
  if (fromParam) tableSearchParams.set('from', fromParam)
  if (toParam) tableSearchParams.set('to', toParam)
  if (showAllPageStats) tableSearchParams.set('pages', 'all')

  const getSortHref = (key: PageSortKey) => {
    const nextDirection: SortDirection =
      pageSortKey === key && sortDirection === 'desc' ? 'asc' : 'desc'
    const params = new URLSearchParams(tableSearchParams)
    params.set('sort', key)
    params.set('dir', nextDirection)
    return `${adminBasePath}?${params.toString()}`
  }

  const renderSortLabel = (label: string, key: PageSortKey) => {
    const arrow = pageSortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'

    return (
      <Link
        href={getSortHref(key)}
        scroll={false}
        className="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-[11px] text-gray-400">
          {arrow}
        </span>
      </Link>
    )
  }

  const getPageListToggleHref = () => {
    const params = new URLSearchParams(tableSearchParams)
    if (showAllPageStats) {
      params.delete('pages')
    } else {
      params.set('pages', 'all')
    }
    const query = params.toString()
    return query ? `${adminBasePath}?${query}` : adminBasePath
  }

  return (
    <div className="admin-container">
      <div className="admin-content space-y-5 sm:space-y-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>
          <AdminStatsRefreshButton />
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Период</h2>
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Быстрый выбор:</span>
              <AdminStatsPeriodPresets adminBasePath={adminBasePath} period={isCustom ? null : period} />
            </div>
            <form method="get" className="flex w-full flex-wrap items-end gap-3 border-t border-gray-200 pt-4 lg:w-auto lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <AdminDatePicker
                name="from"
                id="admin-stats-from"
                label="С"
                defaultValue={fromParam ?? formatDateInputValue(from)}
                maxDate={toParam ?? undefined}
              />
              <AdminDatePicker
                name="to"
                id="admin-stats-to"
                label="По"
                defaultValue={toParam ?? formatDateInputValue(to)}
                minDate={fromParam ?? undefined}
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="rounded-md border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 min-h-[44px]"
                >
                  Применить
                </button>
                {isCustom && (
                  <Link
                    href={adminBasePath}
                    scroll={false}
                    className="text-sm text-gray-500 underline hover:text-gray-800"
                  >
                    Сбросить
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-gray-500 mb-1.5">Просмотры страниц (суммарно)</p>
            <p className="text-2xl font-semibold">
              {trafficTotal._sum.pageViews ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1.5">Сессии (условно)</p>
            <p className="text-2xl font-semibold">
              {trafficTotal._sum.sessions ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1.5">Клики (суммарно)</p>
            <p className="text-2xl font-semibold">
              {trafficTotal._sum.clicks ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1.5">Заказы (всего создано)</p>
            <p className="text-2xl font-semibold">
              {ordersCount}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <div className="card min-w-0">
            <h2 className="text-lg font-semibold mb-3">Топ страниц по просмотрам</h2>
            <div className="space-y-3.5 md:hidden">
              {visiblePageStats.map((row) => {
                return (
                  <div key={row.path} className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs text-gray-500 break-all">{row.path}</p>
                    <div className="mt-2.5 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Просмотры</span>
                      <span className="font-semibold text-gray-900">{row.pageViews}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Клики</span>
                      <span className="font-semibold text-gray-900">{row.clicks}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-sm">
                      <span className="text-gray-600">CTR</span>
                      <span className="font-semibold text-gray-900">{row.ctr != null ? `${row.ctr}%` : '—'}</span>
                    </div>
                  </div>
                )
              })}
              {sortedPageStats.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-500 text-center">
                  Пока нет данных по страницам за выбранный период.
                </div>
              )}
            </div>
            <div className="hidden w-full max-w-full overflow-hidden md:block">
              <table className="table table-horizontal w-full table-fixed">
                <colgroup>
                  <col className="w-auto" />
                  <col className="w-[110px]" />
                  <col className="w-[90px]" />
                  <col className="w-[80px]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {renderSortLabel('Страница', 'path')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {renderSortLabel('Просмотры', 'pageViews')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {renderSortLabel('Клики', 'clicks')}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {renderSortLabel('CTR', 'ctr')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePageStats.map((row) => {
                    return (
                      <tr key={row.path} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-sm text-gray-700 break-all">
                          {row.path}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                          {row.pageViews}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                          {row.clicks}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                          {row.ctr != null ? `${row.ctr}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {sortedPageStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-sm text-gray-500 text-center"
                      >
                        Пока нет данных по страницам за выбранный период.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {hasHiddenPageStats && (
              <div className="mt-4 flex justify-center">
                <Link
                  href={getPageListToggleHref()}
                  scroll={false}
                  className="text-sm font-medium text-gray-600 underline underline-offset-4 transition-colors hover:text-gray-900"
                >
                  {showAllPageStats ? 'свернуть' : 'смотреть больше'}
                </Link>
              </div>
            )}
          </div>
          <div className="card min-w-0">
            <h2 className="text-lg font-semibold mb-3">Устройства</h2>
            {(() => {
              const total =
                deviceStats.desktop +
                deviceStats.mobile +
                deviceStats.tablet +
                deviceStats.other
              const formatPct = (value: number) =>
                total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'
              return (
                <>
                  <div className="mb-2 flex justify-end text-[11px] uppercase tracking-wide text-gray-400">
                    <span className="w-[80px] text-right mr-2">Кол-во</span>
                    <span className="w-[40px] text-right">%</span>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">ПК</dt>
                      <dd className="flex items-baseline font-semibold text-gray-900">
                        <span className="w-[80px] text-right">
                          {deviceStats.desktop}
                        </span>
                        <span className="ml-2 w-[40px] text-right text-xs text-gray-500">
                          {formatPct(deviceStats.desktop)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Смартфоны</dt>
                      <dd className="flex items-baseline font-semibold text-gray-900">
                        <span className="w-[80px] text-right">
                          {deviceStats.mobile}
                        </span>
                        <span className="ml-2 w-[40px] text-right text-xs text-gray-500">
                          {formatPct(deviceStats.mobile)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Планшеты</dt>
                      <dd className="flex items-baseline font-semibold text-gray-900">
                        <span className="w-[80px] text-right">
                          {deviceStats.tablet}
                        </span>
                        <span className="ml-2 w-[40px] text-right text-xs text-gray-500">
                          {formatPct(deviceStats.tablet)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-gray-600">Другое / не определено</dt>
                      <dd className="flex items-baseline font-semibold text-gray-900">
                        <span className="w-[80px] text-right">
                          {deviceStats.other}
                        </span>
                        <span className="ml-2 w-[40px] text-right text-xs text-gray-500">
                          {formatPct(deviceStats.other)}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </>
              )
            })()}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Воронка за последние дни</h2>
          <div className="space-y-3.5 md:hidden">
            {funnelByDate.map((group) => (
              <div key={group.dateKey} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2 border-b border-gray-200 pb-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Дата</p>
                  <p className="text-sm font-semibold text-gray-900">{group.dateKey}</p>
                </div>
                <div className="space-y-3">
                  {group.rows.map((row) => (
                    <div key={`${group.dateKey}-${row.step}`} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-600">Шаг</span>
                        <span className="font-medium text-gray-900 text-right">{getFunnelStepLabel(row.step)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-600">Кол-во</span>
                        <span className="font-semibold text-gray-900">{row.count}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-600">Конверсия</span>
                        <span className="font-semibold text-gray-900">
                          {row.conversionToNext != null ? `${Math.round(row.conversionToNext * 100)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {funnelTotal.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 text-sm text-gray-500 text-center">
                Данных пока нет. После появления событий и запуска агрегации здесь появится воронка.
              </div>
            )}
          </div>
          <div className="hidden w-full max-w-full overflow-hidden md:block">
            <table className="table table-horizontal w-full table-fixed">
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-auto" />
                <col className="w-[100px]" />
                <col className="w-[200px]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Шаг
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Кол-во
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Конверсия в следующий шаг
                  </th>
                </tr>
              </thead>
              <tbody>
                {funnelByDate.flatMap((group) => [
                  (
                    <tr key={`group-${group.dateKey}`} className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {group.dateKey}
                      </td>
                    </tr>
                  ),
                  ...group.rows.map((row) => (
                    <tr key={`${group.dateKey}-${row.step}`} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-sm text-gray-400">—</td>
                      <td className="px-4 py-2 text-sm text-gray-700 break-words">{getFunnelStepLabel(row.step)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">{row.count}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                        {row.conversionToNext != null
                          ? `${Math.round(row.conversionToNext * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                  )),
                ])}
                {funnelTotal.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-sm text-gray-500 text-center"
                    >
                      Данных пока нет. После появления событий и запуска агрегации
                      здесь появится воронка.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
