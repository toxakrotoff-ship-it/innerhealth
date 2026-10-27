import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ query: vi.fn(), config: vi.fn(), rate: vi.fn(), mapKey: vi.fn() }))
vi.mock('@/services/settings.service', () => ({ getYandexMapsApiKey: mocks.mapKey }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: mocks.query } }))
vi.mock('@/lib/ozon-delivery/config', () => ({ getOzonDeliveryConfig: mocks.config }))
vi.mock('@/lib/ozon-delivery/http', () => ({
  ozonRateLimit: mocks.rate,
  ozonErrorResponse: () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 }),
}))
vi.mock('@/lib/brand/brand-request', () => ({ resolveBrandOrDefaultFromRequest: (r: Request) => new URL(r.url).searchParams.get('brand') || 'inner' }))
import { GET } from './route'

beforeEach(() => {
  vi.resetAllMocks(); mocks.rate.mockResolvedValue(null); mocks.config.mockResolvedValue({}); mocks.mapKey.mockResolvedValue(undefined)
  mocks.query.mockResolvedValue([{ pointId: '123', name: 'Ozon', address: 'Россия, Москва, Тверская, 1' }])
})
describe('city-scoped Ozon point search', () => {
  it('suggests complete cities from fresh points of the requested storefront', async () => {
    mocks.query.mockResolvedValueOnce([{ city: 'Санкт-Петербург' }]).mockResolvedValueOnce([])
    const response = await GET(new Request('https://site/api/ozon-delivery/points?city=Санкт&suggestCities=true&brand=sprint-power'))
    expect(await response.json()).toMatchObject({ cities: ['Санкт-Петербург'], points: [] })
    const sql = mocks.query.mock.calls[0][0]
    expect(sql.values).toContain('sprint-power')
    expect(sql.values.some((value: unknown) => value instanceof Date)).toBe(true)
    expect(sql.text).toContain('regexp_match')
    expect(sql.text).toContain('city !~*')
    expect(sql.text).toContain('LIMIT 12')
    expect(sql.text).not.toContain('Санкт')
  })
  it('accepts a street and house separated by commas or address labels', async () => {
    await GET(new Request('https://site/api/ozon-delivery/points?city=Москва&query=ул.%20Твёрская,д.10'))
    const sql = mocks.query.mock.calls[0][0]
    expect(sql.values).toContain('%тверская%')
    expect(sql.values).toContain('%10%')
    expect(sql.values).not.toContain('%ул%')
    expect(sql.text).toContain("translate(lower(address), 'ё', 'е')")
  })
  it('returns cached coordinates and the public map key for the requested brand', async () => {
    mocks.mapKey.mockResolvedValue('public-map-key')
    mocks.query.mockResolvedValue([{ pointId: '123', name: 'Ozon', address: 'Москва', latitude: 55.75, longitude: 37.61 }])
    const response = await GET(new Request('https://site/api/ozon-delivery/points?city=Москва&brand=sprint-power'))
    expect(await response.json()).toMatchObject({ mapApiKey: 'public-map-key', points: [{ coordinates: { latitude: 55.75, longitude: 37.61 } }] })
    expect(mocks.mapKey).toHaveBeenCalledWith({ brandId: 'sprint-power' })
  })
  it('keeps points available if the map settings cannot be read', async () => {
    mocks.mapKey.mockRejectedValue(new Error('settings unavailable'))
    expect((await GET(new Request('https://site/api/ozon-delivery/points?city=Москва'))).status).toBe(200)
  })
  it('loads only fresh points for the storefront and complete city, with optional street words as SQL parameters', async () => {
    const response = await GET(new Request('https://site/api/ozon-delivery/points?city=Москва&query=Тверская%2050%25&brand=sprint-power'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const sql = mocks.query.mock.calls[0][0]
    expect(sql.values).toContain('sprint-power')
    expect(sql.values).toContain('%тверская%')
    expect(sql.values).toContain('%50\\%%')
    expect(sql.values.some((value: unknown) => value instanceof Date && Math.abs(value.getTime() - (Date.now() - 48 * 3600000)) < 5000)).toBe(true)
    expect(sql.text).toContain('address ~*')
    expect(sql.text).not.toContain('Москва')
    expect(await response.json()).toEqual({ points: [{ id: 123, name: 'Ozon', address: 'Россия, Москва, Тверская, 1' }], hasMore: false })
  })
  it('limits browser payload to 30 points and reports that the customer can refine the address', async () => {
    mocks.query.mockResolvedValue(Array.from({ length: 31 }, (_, i) => ({ pointId: String(i + 1), name: 'Ozon', address: 'Москва' })))
    const response = await GET(new Request('https://site/api/ozon-delivery/points?city=Москва'))
    const data = await response.json()
    expect(data.points).toHaveLength(30); expect(data.hasMore).toBe(true)
  })
  it.each(['', '?city=А', '?city=г.', '?city=19&suggestCities=true', `?city=${'a'.repeat(101)}`, '?query=А'])('rejects invalid input before database work (%s)', async query => {
    expect((await GET(new Request(`https://site/api/ozon-delivery/points${query}`))).status).toBe(400)
    expect(mocks.query).not.toHaveBeenCalled()
  })
  it('keeps legacy address searches working and respects disabled settings and rate limits', async () => {
    expect((await GET(new Request('https://site/api/ozon-delivery/points?query=Москва'))).status).toBe(200)
    mocks.query.mockClear(); mocks.config.mockResolvedValue(null)
    expect((await GET(new Request('https://site/api/ozon-delivery/points?city=Москва'))).status).toBe(503)
    expect(mocks.query).not.toHaveBeenCalled()
    mocks.rate.mockResolvedValue(new Response(null, { status: 429 }))
    expect((await GET(new Request('https://site/api/ozon-delivery/points?city=Москва'))).status).toBe(429)
  })
})
