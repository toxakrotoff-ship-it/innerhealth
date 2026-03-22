import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { AdminDatePicker } from './components/AdminDatePicker'
import { AdminStatsPeriodPresets } from './components/AdminStatsPeriodPresets'

export const dynamic = 'force-dynamic'

type PeriodKey = '7d' | '30d' | '90d' | 'all'

function resolvePeriod(period: string | undefined): PeriodKey {
  if (period === '7d' || period === '30d' || period === '90d' || period === 'all') {
    return period
  }
  return '30d'
}

function parseDateParam(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  d.setHours(0, 0, 0, 0)
  return d
}

function getDateRange(
  period: PeriodKey,
  customFrom?: string,
  customTo?: string
): { from?: Date; to?: Date; isCustom: boolean } {
  const fromDate = parseDateParam(customFrom)
  const toDate = parseDateParam(customTo)

  if (fromDate && toDate && fromDate <= toDate) {
    return { from: fromDate, to: toDate, isCustom: true }
  }

  if (period === 'all') return { isCustom: false }
  const to = new Date()
  to.setHours(0, 0, 0, 0)
  const from = new Date(to)
  if (period === '7d') from.setDate(from.getDate() - 6)
  if (period === '30d') from.setDate(from.getDate() - 29)
  if (period === '90d') from.setDate(from.getDate() - 89)
  return { from, to, isCustom: false }
}

interface DeviceStats {
  desktop: number
  mobile: number
  other: number
}

interface PageStat {
  path: string
  pageViews: number
  clicks: number
}

async function getSummary(period: PeriodKey, customFrom?: string, customTo?: string) {
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
      funnelTotal: [] as Array<{
        date: Date
        step: string
        count: number
        conversionToNext: number | null
      }>,
      ordersCount: 0,
      pageStats: [] as PageStat[],
      deviceStats: { desktop: 0, mobile: 0, other: 0 } as DeviceStats,
    }
  }

  const { from, to } = getDateRange(period, customFrom, customTo)

  const dateWhere = from && to
    ? { gte: from, lte: to }
    : undefined

  const [trafficTotal, funnelTotal, ordersCount, deviceDesktop, deviceMobile] = await Promise.all([
    anyPrisma.dailyTrafficStats.aggregate({
      where: dateWhere ? { date: dateWhere } : undefined,
      _sum: { pageViews: true, sessions: true, clicks: true },
    }),
    anyPrisma.dailyFunnelStats.findMany({
      where: dateWhere ? { date: dateWhere } : undefined,
      orderBy: { date: 'desc' },
      take: 90,
    }),
    anyPrisma.order.count({
      where: dateWhere ? { createdAt: dateWhere } : undefined,
    }),
    anyPrisma.analyticsEvent
      ? anyPrisma.analyticsEvent.count({
          where: {
            type: 'PAGE_VIEW',
            occurredAt: dateWhere,
            meta: {
              path: ['deviceType'],
              equals: 'desktop',
            },
          },
        })
      : Promise.resolve(0),
    anyPrisma.analyticsEvent
      ? anyPrisma.analyticsEvent.count({
          where: {
            type: 'PAGE_VIEW',
            occurredAt: dateWhere,
            meta: {
              path: ['deviceType'],
              equals: 'mobile',
            },
          },
        })
      : Promise.resolve(0),
  ])

  const deviceStats: DeviceStats = {
    desktop: deviceDesktop,
    mobile: deviceMobile,
    other: Math.max(0, (trafficTotal._sum.pageViews ?? 0) - deviceDesktop - deviceMobile),
  }

  const trafficRows = anyPrisma.dailyTrafficStats
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
        where: dateWhere ? { date: dateWhere } : undefined,
        select: {
          date: true,
          path: true,
          pageViews: true,
          clicks: true,
        },
      })
    : []

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

  const period = resolvePeriod(periodParam)

  const adminBasePath = `/${process.env.ADMIN_SECRET_PATH ?? 'admin'}`

  const { from, to, isCustom } = getDateRange(period, fromParam, toParam)
  const { trafficTotal, funnelTotal, ordersCount, pageStats, deviceStats } = await getSummary(
    period,
    fromParam,
    toParam
  )

  return (
    <div className="admin-container">
      <div className="admin-content space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Статистика</h1>

        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Период</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Быстрый выбор:</span>
              <AdminStatsPeriodPresets adminBasePath={adminBasePath} period={period} />
            </div>
            <form method="get" className="flex flex-wrap items-end gap-3 border-l border-gray-200 pl-4">
              <AdminDatePicker
                name="from"
                id="admin-stats-from"
                label="С"
                defaultValue={fromParam ?? (from ? from.toISOString().slice(0, 10) : '')}
                maxDate={toParam ?? undefined}
              />
              <AdminDatePicker
                name="to"
                id="admin-stats-to"
                label="По"
                defaultValue={toParam ?? (to ? to.toISOString().slice(0, 10) : '')}
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
        <div className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Просмотры страниц (суммарно)</p>
            <p className="text-2xl font-semibold">
              {trafficTotal._sum.pageViews ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Сессии (условно)</p>
            <p className="text-2xl font-semibold">
              {trafficTotal._sum.sessions ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Клики (суммарно)</p>
            <p className="text-2xl font-semibold">
              {trafficTotal._sum.clicks ?? 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Заказы (всего создано)</p>
            <p className="text-2xl font-semibold">
              {ordersCount}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Топ страниц по просмотрам</h2>
            <div className="overflow-x-auto">
              <table className="table table-horizontal min-w-[500px]">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Страница
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Просмотры
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Клики
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      CTR
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageStats.slice(0, 50).map((row) => {
                    const ctr =
                      row.pageViews > 0 ? Math.round((row.clicks / row.pageViews) * 100) : null
                    return (
                      <tr key={row.path} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {row.path}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {row.pageViews}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {row.clicks}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {ctr != null ? `${ctr}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {pageStats.length === 0 && (
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
          </div>
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Устройства</h2>
            {(() => {
              const total =
                deviceStats.desktop + deviceStats.mobile + deviceStats.other
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
          <div className="overflow-x-auto">
            <table className="table table-horizontal min-w-[500px]">
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
                {funnelTotal.map((row) => (
                  <tr key={`${row.date.toISOString()}-${row.step}`} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {row.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.step}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{row.count}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {row.conversionToNext != null
                        ? `${Math.round(row.conversionToNext * 100)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
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
