import { describe, expect, it } from 'vitest'
import {
  buildFunnelStatsFromCounts,
  computeConversionToNext,
} from './funnel-stats'

describe('computeConversionToNext', () => {
  it('returns ratio without capping above 100%', () => {
    expect(computeConversionToNext(15, 28)).toBeCloseTo(28 / 15)
  })

  it('returns null when current step count is zero', () => {
    expect(computeConversionToNext(0, 5)).toBeNull()
  })
})

describe('buildFunnelStatsFromCounts', () => {
  it('builds ordered funnel rows with conversion', () => {
    const counts = new Map<string, number>([
      ['inner:PAGE_VIEW', 100],
      ['inner:CART_ADD', 10],
      ['inner:CHECKOUT_START', 5],
      ['inner:ORDER_CREATED', 4],
    ])

    const rows = buildFunnelStatsFromCounts({
      brand: 'inner',
      date: new Date('2026-05-31'),
      counts,
    })

    expect(rows.map((row) => row.step)).toEqual([
      'PAGE_VIEW',
      'CART_ADD',
      'CHECKOUT_START',
      'ORDER_CREATED',
    ])
    expect(rows[0]?.conversionToNext).toBeCloseTo(0.1)
    expect(rows[2]?.conversionToNext).toBeCloseTo(0.8)
    expect(rows[3]?.conversionToNext).toBeNull()
  })
})
