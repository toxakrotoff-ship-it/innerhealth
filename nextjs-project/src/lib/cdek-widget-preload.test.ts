import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCdekWidgetItemsSignature } from '@/lib/cdek-widget-items'

vi.mock('@/lib/cdek-widget-items', async () => {
  const actual = await vi.importActual<typeof import('@/lib/cdek-widget-items')>('@/lib/cdek-widget-items')
  return actual
})

describe('cdek-widget-preload', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('deduplicates config requests by brand and cart signature', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        from: { code: 44, country_code: 'RU' },
        goods: [{ width: 1, height: 1, length: 1, weight: 100 }],
        tariffs: { office: [136], door: [137] },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { getCachedCdekWidgetConfig } = await import('@/lib/cdek-widget-preload')
    const items = [{ productId: 'a', quantity: 1 }]

    await Promise.all([
      getCachedCdekWidgetConfig({ brandId: 'inner', items }),
      getCachedCdekWidgetConfig({ brandId: 'inner', items }),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(buildCdekWidgetItemsSignature(items)).toBe('a:1')
  })
})
