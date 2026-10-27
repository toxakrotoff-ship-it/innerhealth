import { createHash, webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/cdn', () => ({ CDN_URL: 'https://cdn.example.test' }))

const point = { id: 123, name: 'Ozon', address: 'Москва, Тверская, 1', coordinates: { latitude: 55.75, longitude: 37.61 } }
beforeEach(() => { vi.resetModules(); vi.stubGlobal('crypto', webcrypto) })
afterEach(() => { vi.unstubAllGlobals() })

describe('Ozon map data through pickup search', () => {
  it('preserves coordinates and the storefront map key through origin fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/manifest?')
      ? new Response(null, { status: 503 })
      : Response.json({ points: [point], hasMore: false, mapApiKey: 'storefront-key' })))
    const { searchOzonPoints } = await import('./ozon-pvz-client')
    expect(await searchOzonPoints({ city: 'Москва', brandId: 'inner' })).toEqual({ points: [point], hasMore: false, mapApiKey: 'storefront-key' })
  })

  it('preserves coordinates from immutable CDN snapshots and reads the current key from each manifest', async () => {
    const text = JSON.stringify([point])
    const version = createHash('sha256').update(text).digest('hex')
    const cityKey = createHash('sha256').update('москва').digest('hex')
    let mapApiKey = 'first-key'
    const fetchMock = vi.fn(async (url: string) => url.includes('/manifest?')
      ? Response.json({ schemaVersion: 1, brand: 'inner', city: 'москва', cityKey, publishedAt: new Date().toISOString(), mapApiKey,
        entry: { path: `/api/ozon-pvz/cities/inner/${version}/${cityKey}.json`, totalCount: 1, updatedAt: new Date().toISOString() } })
      : new Response(text))
    vi.stubGlobal('fetch', fetchMock)
    const { searchOzonPoints } = await import('./ozon-pvz-client')
    expect(await searchOzonPoints({ city: 'Москва', brandId: 'inner' })).toEqual({ points: [point], hasMore: false, mapApiKey: 'first-key' })
    mapApiKey = 'updated-key'
    expect((await searchOzonPoints({ city: 'Москва', brandId: 'inner' })).mapApiKey).toBe('updated-key')
    expect(fetchMock.mock.calls.filter(([url]) => url.startsWith('https://cdn.'))).toHaveLength(1)
  })
})
