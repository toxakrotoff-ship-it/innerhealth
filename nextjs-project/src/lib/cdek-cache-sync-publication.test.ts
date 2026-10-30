import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  upsert: vi.fn(),
  markStale: vi.fn(),
  shipping: vi.fn(),
  addresses: vi.fn(),
  syncRun: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/cdek-pvz-publication', () => ({ publishCdekPvzRegions: mocks.publish }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  cdekOfficeCache: { upsert: mocks.upsert, updateMany: mocks.markStale },
  shippingInfo: { findMany: mocks.shipping },
  userAddress: { findMany: mocks.addresses },
  cdekCacheSyncRun: { create: mocks.syncRun },
} }))
vi.mock('@/services/settings.service', () => ({ getCdekCredentials: vi.fn(async () => ({ useTest: false })) }))
vi.mock('@/lib/cdek', () => ({
  getCdekToken: vi.fn(async () => 'test-token'),
  resolveCdekSenderSettings: vi.fn(async () => ({ ok: true, settings: { fromCityCode: 44 } })),
  getCdekCities: vi.fn(async () => []),
  calculateCdekTariffList: vi.fn(),
}))

import { runCdekCacheSync } from './cdek-cache-sync'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.publish.mockResolvedValue({ publishedAt: '2026-10-27T01:00:00Z' })
  mocks.shipping.mockResolvedValue([])
  mocks.addresses.mockResolvedValue([])
  mocks.markStale.mockResolvedValue({ count: 1 })
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
    url.includes('/location/regions') ? [{ region_code: 81, region: 'Москва' }] : [{ code: 'MSK1' }]
  ))))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('nightly PVZ publication timing', () => {
  it('publishes after the regional writes and before starting tariff warmup', async () => {
    const summary = await runCdekCacheSync()
    expect(mocks.publish).toHaveBeenCalledWith([81])
    expect(mocks.upsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.publish.mock.invocationCallOrder[0])
    expect(mocks.publish.mock.invocationCallOrder[0]).toBeLessThan(mocks.shipping.mock.invocationCallOrder[0])
    expect(summary).toMatchObject({ ok: true, pvzPublishedAt: '2026-10-27T01:00:00Z' })
  })

  it('reports publication failures but still performs tariff warmup', async () => {
    mocks.publish.mockRejectedValue(new Error('disk unavailable'))
    const summary = await runCdekCacheSync()
    expect(mocks.shipping).toHaveBeenCalledOnce()
    expect(summary).toMatchObject({ ok: false, pvzPublishedAt: null })
    expect(summary.errors).toContainEqual({ scope: 'pvz-publication', key: 'manifest', message: 'disk unavailable' })
    expect(mocks.syncRun).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ok: false }) }))
  })

  it('keeps the previous regional DB payload if pagination reaches the hard ceiling', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes('/location/regions') ? [{ region_code: 81, region: 'Москва' }] : Array.from({ length: 500 }, () => ({ code: 'PVZ' }))
    ))))
    const summary = await runCdekCacheSync()
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.markStale).toHaveBeenCalledWith({ where: { regionCode: 81 }, data: { isStale: true } })
    expect(summary.regionsFailed).toBe(1)
    expect(summary.errors[0].message).toContain('pagination exceeded')
  })

  it('does not overwrite the DB payload with an empty array for a malformed 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes('/location/regions') ? [{ region_code: 81, region: 'Москва' }] : { message: 'invalid response' }
    ))))
    const summary = await runCdekCacheSync()
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.markStale).toHaveBeenCalledOnce()
    expect(summary.regionsFailed).toBe(1)
    expect(summary.errors[0].message).toContain('must be an array')
  })

  it('does not publish a truncated region enumeration', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(
      Array.from({ length: 200 }, (_, index) => ({ region_code: index + 1 }))
    ))))
    const rejected = expect(runCdekCacheSync()).rejects.toThrow('regions pagination exceeded')
    await vi.runAllTimersAsync()
    await rejected
    expect(mocks.publish).not.toHaveBeenCalled()
  })
})
