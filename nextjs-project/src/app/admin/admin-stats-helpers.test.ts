import { describe, expect, it } from 'vitest'
import { buildFallbackTrafficRowsByPath } from './admin-stats-helpers'

describe('buildFallbackTrafficRowsByPath', () => {
  it('merges clicks and page views by path including homepage', () => {
    const from = new Date('2026-03-27T00:00:00.000Z')

    const rows = buildFallbackTrafficRowsByPath({
      from,
      pageViewByPathRows: [
        { path: '/', _count: { _all: 10 } },
        { path: '/catalog', _count: { _all: 5 } },
      ],
      clickByPathRows: [
        { path: '/', _count: { _all: 3 } },
        { path: '/promo', _count: { _all: 2 } },
      ],
    })

    expect(rows).toEqual([
      { date: from, path: '/', pageViews: 10, clicks: 3 },
      { date: from, path: '/catalog', pageViews: 5, clicks: 0 },
      { date: from, path: '/promo', pageViews: 0, clicks: 2 },
    ])
  })
})
