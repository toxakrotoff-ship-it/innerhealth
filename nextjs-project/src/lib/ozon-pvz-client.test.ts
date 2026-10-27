import { createHash, webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OzonPublicPoint } from './ozon-pvz-types'

const config = vi.hoisted(() => ({ cdn: 'https://cdn.example' }))
vi.mock('@/lib/cdn', () => ({ get CDN_URL() { return config.cdn } }))

const city = 'Москва'
const normalizedCity = 'москва'
const fallbackPoint = { id: 500, name: 'Origin point', address: 'Москва, Тверская, 1' }
const point = { id: 1, name: 'CDN point', address: 'Москва, Тверская, 10' }
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status })
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

function release(points: unknown = [point], overrides: Record<string, unknown> = {}) {
  const text = JSON.stringify(points)
  const cityKey = sha256(normalizedCity)
  const path = `/api/ozon-pvz/cities/inner/${sha256(text)}/${cityKey}.json`
  const manifest = {
    schemaVersion: 1, brand: 'inner', publishedAt: new Date().toISOString(), city: normalizedCity, cityKey,
    entry: { path, totalCount: Array.isArray(points) ? points.length : 1, updatedAt: new Date().toISOString() },
    ...overrides,
  }
  return { text, manifest, path }
}

describe('Ozon city snapshots client', () => {
  let searchOzonPoints: typeof import('./ozon-pvz-client').searchOzonPoints
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(async () => {
    vi.resetModules()
    fetchMock.mockReset()
    config.cdn = 'https://cdn.example'
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('crypto', webcrypto)
    ;({ searchOzonPoints } = await import('./ozon-pvz-client'))
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  it('reads a fresh origin pointer and verifies the city snapshot from CDN', async () => {
    const { manifest, text, path } = release()
    fetchMock.mockResolvedValueOnce(json(manifest)).mockResolvedValueOnce(new Response(text))
    await expect(searchOzonPoints({ city: 'г. Москва', brandId: 'inner' })).resolves.toEqual({ points: [point], hasMore: false })
    const pointerUrl = new URL(String(fetchMock.mock.calls[0][0]), 'https://example.com')
    expect(pointerUrl.pathname).toBe('/api/ozon-pvz/manifest')
    expect(pointerUrl.searchParams.get('city')).toBe('Москва')
    expect(pointerUrl.searchParams.get('brand')).toBe('inner')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' })
    expect(fetchMock.mock.calls[1][0]).toBe(`https://cdn.example${path}`)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: 'omit' })
    expect(fetchMock.mock.calls[1][1]).not.toHaveProperty('cache')
    expect(fetchMock.mock.calls.every(([, options]) => options?.body === undefined)).toBe(true)
  })

  it('always checks the release pointer and immediately loads a new snapshot version', async () => {
    const first = release()
    const secondPoint = { ...point, name: 'Updated point' }
    const second = release([secondPoint])
    fetchMock.mockResolvedValueOnce(json(first.manifest)).mockResolvedValueOnce(new Response(first.text))
      .mockResolvedValueOnce(json(second.manifest)).mockResolvedValueOnce(new Response(second.text))
      .mockResolvedValueOnce(json(second.manifest))
    await searchOzonPoints({ city, brandId: 'inner' })
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [secondPoint], hasMore: false })
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [secondPoint], hasMore: false })
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/ozon-pvz/manifest'))).toHaveLength(3)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('https://cdn.example'))).toHaveLength(2)
  })

  it('reuses unchanged city versions while filtering street words locally and limiting results to30', async () => {
    const points: OzonPublicPoint[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1, name: `Point ${index}`, address: index === 0 ? 'Москва, Тверская, 10' : `Москва, Арбат, ${index}`,
    }))
    const snapshot = release(points)
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text))
      .mockResolvedValueOnce(json(snapshot.manifest))
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: points.slice(0, 30), hasMore: true })
    await expect(searchOzonPoints({ city, brandId: 'inner', query: '  ТВЕРСКАЯ  10  ' })).resolves.toEqual({ points: [points[0]], hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('query='))).toBe(true)
  })

  it('uses only the origin API when CDN is disabled', async () => {
    config.cdn = ''
    fetchMock.mockResolvedValueOnce(json({ points: [fallbackPoint], hasMore: true }))
    await expect(searchOzonPoints({ city, brandId: 'inner', query: 'Тверская' })).resolves.toEqual({ points: [fallbackPoint], hasMore: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    const parsed = new URL(String(url), 'https://example.com')
    expect(parsed.pathname).toBe('/api/ozon-delivery/points')
    expect(parsed.searchParams.get('city')).toBe(city)
    expect(parsed.searchParams.get('query')).toBe('Тверская')
    expect(options).toMatchObject({ cache: 'no-store', credentials: 'omit' })
  })

  it('returns all matching city points for the map while keeping the same snapshot limited for the list', async () => {
    const points = Array.from({ length: 80 }, (_, index) => ({ ...point, id: index + 1,
      address: index < 40 ? `Москва, Арбат, ${index}` : `Москва, Тверская, ${index}` }))
    const snapshot = release(points)
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text))
      .mockResolvedValueOnce(json(snapshot.manifest))
    await expect(searchOzonPoints({ city, brandId: 'inner', view: 'map', query: 'Арбат' })).resolves.toEqual({ points: points.slice(0, 40), hasMore: false })
    await expect(searchOzonPoints({ city, brandId: 'inner', view: 'list', query: 'Арбат' })).resolves.toEqual({ points: points.slice(0, 30), hasMore: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each(['disabled', 'unavailable'] as const)('keeps the complete map result when CDN is %s and requests map view from origin', async state => {
    const points = Array.from({ length: 45 }, (_, index) => ({ ...point, id: index + 1 }))
    if (state === 'disabled') config.cdn = ''
    else fetchMock.mockResolvedValueOnce(json({ entry: null }))
    fetchMock.mockResolvedValueOnce(json({ points, hasMore: true }))
    await expect(searchOzonPoints({ city, brandId: 'inner', view: 'map' })).resolves.toEqual({ points, hasMore: false })
    const url = new URL(String(fetchMock.mock.lastCall![0]), 'https://example.com')
    expect(url.pathname).toBe('/api/ozon-delivery/points')
    expect(url.searchParams.get('view')).toBe('map')
  })

  it('preserves map view during city suggestions and keeps list results bounded', async () => {
    const points = Array.from({ length: 45 }, (_, index) => ({ ...point, id: index + 1 }))
    fetchMock.mockResolvedValueOnce(json({ points, cities: [city], hasMore: true }))
      .mockResolvedValueOnce(json({ points, cities: [city], hasMore: true }))
    await expect(searchOzonPoints({ city, brandId: 'inner', view: 'map', suggestCities: true })).resolves.toEqual({ points, cities: [city], hasMore: false })
    const first = new URL(String(fetchMock.mock.calls[0][0]), 'https://example.com')
    expect(first.searchParams.get('view')).toBe('map')
    expect(first.searchParams.get('suggestCities')).toBe('true')
    await expect(searchOzonPoints({ city, brandId: 'inner', suggestCities: true })).resolves.toEqual({ points: points.slice(0, 30), cities: [city], hasMore: true })
    expect(new URL(String(fetchMock.mock.calls[1][0]), 'https://example.com').searchParams.has('view')).toBe(false)
  })

  it('keeps valid public map coordinates and the current map key through CDN reads', async () => {
    const mapPoint = { ...point, coordinates: { latitude: 55.75, longitude: 37.61 } }
    const snapshot = release([mapPoint], { mapApiKey: 'public-map-key' })
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text))
    await expect(searchOzonPoints({ city, brandId: 'inner', query: 'ул. ТВЕРСКАЯ, д. 10' })).resolves.toEqual({
      points: [mapPoint], hasMore: false, mapApiKey: 'public-map-key',
    })
  })

  it('keeps city suggestions on the origin API without downloading a city snapshot', async () => {
    fetchMock.mockResolvedValueOnce(json({ points: [], cities: ['Москва', 'Московский'], mapApiKey: 'public-key' }))
    await expect(searchOzonPoints({ city: 'Моск', brandId: 'inner', suggestCities: true })).resolves.toEqual({
      points: [], hasMore: false, cities: ['Москва', 'Московский'], mapApiKey: 'public-key',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://example.com')
    expect(url.pathname).toBe('/api/ozon-delivery/points')
    expect(url.searchParams.get('suggestCities')).toBe('true')
  })

  it.each([
    { title: 'missing manifest', mutate: () => null },
    { title: 'schema version', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, schemaVersion: 2 }) },
    { title: 'missing city', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, city: undefined }) },
    { title: 'wrong city', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, city: 'казань' }) },
    { title: 'cross brand', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, brand: 'sprint-power' }) },
    { title: 'non-string brand', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, brand: ['inner'] }) },
    { title: 'city key', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, cityKey: 'invalid' }) },
    { title: 'missing entry', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: null }) },
    { title: 'external path', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: { ...value.entry, path: 'https://external.example/city.json' } }) },
    { title: 'cross brand path', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: { ...value.entry, path: value.entry.path.replace('/inner/', '/sprint-power/') } }) },
    { title: 'hashless path', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: { ...value.entry, path: value.entry.path.replace(/[a-f0-9]{64}/, 'latest') } }) },
    { title: 'fractional count', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: { ...value.entry, totalCount: 1.5 } }) },
    { title: 'negative count', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: { ...value.entry, totalCount: -1 } }) },
    { title: 'stale publication', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, publishedAt: new Date(Date.now() - 49 * 3600000).toISOString() }) },
    { title: 'invalid publication', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, publishedAt: 'invalid' }) },
    { title: 'future publication', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, publishedAt: '2099-01-01T00:00:00Z' }) },
    { title: 'stale city', mutate: (value: ReturnType<typeof release>['manifest']) => ({ ...value, entry: { ...value.entry, updatedAt: new Date(Date.now() - 49 * 3600000).toISOString() } }) },
  ])('falls back to origin for $title', async ({ mutate }) => {
    const snapshot = release()
    fetchMock.mockResolvedValueOnce(json(mutate(snapshot.manifest))).mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/ozon-delivery/points?')
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-store' })
  })

  it.each([
    { title: 'unavailable CDN', snapshot: release(), response: () => json({}, 503) },
    { title: 'truncated array', snapshot: release(), response: () => json([]) },
    { title: 'tampered content hash', snapshot: release(), response: () => json([{ ...point, name: 'Tampered' }]) },
    { title: 'invalid point id', snapshot: release([{ ...point, id: '1' }]), response: () => json([{ ...point, id: '1' }]) },
    { title: 'invalid point address', snapshot: release([{ ...point, address: null }]), response: () => json([{ ...point, address: null }]) },
    { title: 'non-array payload', snapshot: release({ points: [point] }), response: () => json({ points: [point] }) },
  ])('falls back for $title without returning unverified CDN points', async ({ snapshot, response }) => {
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(response()).mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('rejects a snapshot whose count does not agree with its otherwise valid hash', async () => {
    const snapshot = release()
    snapshot.manifest.entry.totalCount = 2
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text)).mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
  })

  it('falls back if a cached version is referenced with an inconsistent new count', async () => {
    const snapshot = release()
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text))
    await searchOzonPoints({ city, brandId: 'inner' })
    fetchMock.mockResolvedValueOnce(json({ ...snapshot.manifest, entry: { ...snapshot.manifest.entry, totalCount: 2 } }))
      .mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('falls back on manifest failure and bounds a fetch that ignores timeout abort', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    const result = searchOzonPoints({ city, brandId: 'inner' })
    await vi.advanceTimersByTimeAsync(3000)
    await expect(result).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
    expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('bounds a pointer body that never finishes parsing', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => new Promise(() => {}) } as Response)
      .mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    const result = searchOzonPoints({ city, brandId: 'inner' })
    await vi.advanceTimersByTimeAsync(3000)
    await expect(result).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('bounds CDN requests separately and falls back to origin on timeout', async () => {
    vi.useFakeTimers()
    const snapshot = release()
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    const result = searchOzonPoints({ city, brandId: 'inner' })
    await vi.advanceTimersByTimeAsync(3000)
    await expect(result).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][1]!.signal!.aborted).toBe(true)
  })

  it('falls back safely if browser SHA256 verification is unavailable', async () => {
    vi.stubGlobal('crypto', {})
    const snapshot = release()
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text)).mockResolvedValueOnce(json({ points: [fallbackPoint] }))
    await expect(searchOzonPoints({ city, brandId: 'inner' })).resolves.toEqual({ points: [fallbackPoint], hasMore: false })
  })

  it('does not send any request for an already cancelled search', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(searchOzonPoints({ city, signal: controller.signal })).rejects.toHaveProperty('name', 'AbortError')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cancels a pending pointer request immediately without origin fallback', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    const controller = new AbortController()
    const result = searchOzonPoints({ city, signal: controller.signal })
    const rejected = expect(result).rejects.toHaveProperty('name', 'AbortError')
    controller.abort()
    await rejected
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true)
  })

  it('cancels a pending city snapshot request without origin fallback', async () => {
    const snapshot = release()
    fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockImplementationOnce(() => new Promise(() => {}))
    const controller = new AbortController()
    const result = searchOzonPoints({ city, signal: controller.signal })
    const rejected = expect(result).rejects.toHaveProperty('name', 'AbortError')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    controller.abort()
    await rejected
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('preserves origin API error guidance and bounds the API fallback too', async () => {
    config.cdn = ''
    fetchMock.mockResolvedValueOnce(json({ error: 'Доставка Ozon пока не подключена' }, 503))
    await expect(searchOzonPoints({ city })).rejects.toThrow('Доставка Ozon пока не подключена')
    vi.useFakeTimers()
    fetchMock.mockImplementationOnce(() => new Promise(() => {}))
    const result = searchOzonPoints({ city })
    const rejected = expect(result).rejects.toThrow('Не удалось дождаться ответа')
    await vi.advanceTimersByTimeAsync(8000)
    await rejected
  })

  it('bounds completed snapshot caching instead of retaining every release forever', async () => {
    const releases = Array.from({ length: 17 }, (_, index) => release([{ ...point, name: `Release ${index}` }]))
    for (const snapshot of [...releases, releases[0]]) {
      fetchMock.mockResolvedValueOnce(json(snapshot.manifest)).mockResolvedValueOnce(new Response(snapshot.text))
      await searchOzonPoints({ city, brandId: 'inner' })
    }
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith('https://cdn.example'))).toHaveLength(18)
  })
})
