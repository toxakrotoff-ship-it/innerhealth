import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/product.service', () => ({
  getProductsForCdek: vi.fn(),
}))

vi.mock('@/lib/cdek', () => ({
  mergeCdekPackages: vi.fn((packages: unknown[]) => packages),
  productToCdekPackage: vi.fn(() => ({
    weight: 100,
    length: 10,
    width: 20,
    height: 30,
  })),
  resolveCdekSenderSettings: vi.fn(),
}))

vi.mock('@/services/settings.service', () => ({
  getYandexMapsApiKey: vi.fn(),
}))

import { POST } from './route'

const productService = await import('@/services/product.service')
const cdek = await import('@/lib/cdek')
const settingsService = await import('@/services/settings.service')

describe('POST /api/cdek-widget/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(settingsService.getYandexMapsApiKey).mockResolvedValue('test-yandex-key')
  })

  it('returns sender city from the resolved server-side sender config', async () => {
    vi.mocked(productService.getProductsForCdek).mockResolvedValue([
      {
        id: 'p1',
        weight: 100,
        length: 10,
        width: 20,
        height: 30,
      },
    ] as never)
    vi.mocked(cdek.resolveCdekSenderSettings).mockResolvedValue({
      ok: true,
      settings: {
        fromPvzCode: 'SPB55',
        fromCityCode: 137,
        senderAddress: 'Санкт-Петербург, склад',
        senderName: 'Inner Health',
        senderPhone: '+78120000000',
        scopeUsed: 'global',
        fromPostalCode: null,
        calculatorFromLocation: {
          code: 137,
          country_code: 'RU',
        },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/config?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ productId: 'p1', quantity: 1 }],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      from: {
        code: 137,
        country_code: 'RU',
        city: 'Санкт-Петербург',
        address: 'Санкт-Петербург, склад',
      },
      yandexMapsApiKey: 'test-yandex-key',
      goods: [
        {
          width: 1,
          height: 1,
          length: 1,
          weight: 100,
        },
      ],
      tariffs: {
        office: [136],
        door: [137],
      },
    })
  })
})
