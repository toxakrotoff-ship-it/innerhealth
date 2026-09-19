import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { tariffCacheHitToResult } from './cdek-db-cache-read'

const hit = { deliverySum: 225, periodMin: 1, periodMax: 2, isStale: false }

describe('tariffCacheHitToResult', () => {
  it('отдаёт delivery_mode для ПВЗ (136), иначе виджет СДЭК отбрасывает тариф', () => {
    expect(tariffCacheHitToResult(hit, 136)).toMatchObject({
      tariff_code: 136,
      delivery_sum: 225,
      delivery_mode: 4,
    })
  })

  it('отдаёт delivery_mode для двери (137)', () => {
    expect(tariffCacheHitToResult(hit, 137).delivery_mode).toBe(3)
  })
})
