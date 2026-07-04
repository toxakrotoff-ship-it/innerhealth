import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 10, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => 'test-client'),
}))

vi.mock('@/services/settings.service', () => ({
  getCdekCredentials: vi.fn(),
}))

vi.mock('@/lib/cdek-resolve-region-from-coords', () => ({
  resolveCdekRegionFromCoordinates: vi.fn(),
}))

const settingsService = await import('@/services/settings.service')
const resolveRegion = await import('@/lib/cdek-resolve-region-from-coords')
const rateLimit = await import('@/lib/rate-limit')

describe('POST /api/cdek-widget/geo-region', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_YANDEX_MAPS_API_KEY', 'test-yandex-key')
  })

  it('returns resolved region payload', async () => {
    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(resolveRegion.resolveCdekRegionFromCoordinates).mockResolvedValue({
      regionCode: 39,
      cityCode: 170,
      city: 'Ярославль',
      region: 'Ярославская область',
      defaultLocation: 'Ярославль',
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/geo-region?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 57.6261, longitude: 39.8845 }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      region: {
        regionCode: 39,
        cityCode: 170,
        city: 'Ярославль',
        region: 'Ярославская область',
        defaultLocation: 'Ярославль',
      },
    })
  })

  it('returns null region when reverse geocode fails', async () => {
    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(resolveRegion.resolveCdekRegionFromCoordinates).mockResolvedValue(null)

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/geo-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 0, longitude: 0 }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ region: null })
  })

  it('rejects invalid coordinates', async () => {
    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/geo-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 'bad', longitude: 10 }),
      })
    )

    expect(response.status).toBe(400)
  })

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimit.checkRateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetIn: 42,
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/geo-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: 55.75, longitude: 37.62 }),
      })
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
  })
})
