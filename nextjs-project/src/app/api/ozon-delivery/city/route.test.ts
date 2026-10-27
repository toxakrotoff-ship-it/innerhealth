import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ detect: vi.fn(), rate: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/ozon-delivery/city', () => ({ detectOzonCity: mocks.detect }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, getClientIdentifier: () => 'client' }))
vi.mock('@/lib/brand/brand-request', () => ({ resolveBrandOrDefaultFromRequest: () => 'sprint-power' }))
import { GET } from './route'
beforeEach(() => { vi.resetAllMocks(); mocks.rate.mockResolvedValue({ success: true }); mocks.detect.mockResolvedValue('Казань') })
describe('Ozon customer city endpoint', () => {
  it('returns the approximate city for the correct storefront without browser/CDN caching', async () => {
    const request = new Request('https://site/api/ozon-delivery/city')
    const response = await GET(request)
    expect(mocks.detect).toHaveBeenCalledWith(request, 'sprint-power')
    expect(await response.json()).toEqual({ city: 'Казань' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it('lets the customer type a city when detection is unavailable', async () => {
    mocks.detect.mockResolvedValue(null)
    expect(await (await GET(new Request('https://site'))).json()).toEqual({ city: null })
  })
  it('limits repeated geocoder calls before lookup', async () => {
    mocks.rate.mockResolvedValue({ success: false, resetIn: 60 })
    const response = await GET(new Request('https://site'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    expect(mocks.detect).not.toHaveBeenCalled()
  })
})
