interface PathCountRow {
  path?: string | null
  _count: { _all: number }
}

interface FallbackTrafficRow {
  date: Date
  path: string | null
  pageViews: number
  clicks: number
}

export function buildFallbackTrafficRowsByPath(params: {
  readonly from: Date | undefined
  readonly pageViewByPathRows: readonly PathCountRow[]
  readonly clickByPathRows: readonly PathCountRow[]
}): FallbackTrafficRow[] {
  const { from, pageViewByPathRows, clickByPathRows } = params

  const pageViewByPathMap = new Map<string, number>()
  for (const row of pageViewByPathRows) {
    pageViewByPathMap.set(row.path ?? '', row._count._all)
  }

  const clickByPathMap = new Map<string, number>()
  for (const row of clickByPathRows) {
    clickByPathMap.set(row.path ?? '', row._count._all)
  }

  const paths = new Set<string>([
    ...Array.from(pageViewByPathMap.keys()),
    ...Array.from(clickByPathMap.keys()),
  ])

  return Array.from(paths).map((path) => ({
    date: from ?? new Date(),
    path: path.length > 0 ? path : null,
    pageViews: pageViewByPathMap.get(path) ?? 0,
    clicks: clickByPathMap.get(path) ?? 0,
  }))
}
