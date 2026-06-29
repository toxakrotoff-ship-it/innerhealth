import { afterEach, describe, expect, it } from 'vitest'
import {
  buildSharedOfficesCacheKey,
  clearSharedOfficesCacheForTests,
  getCdekOfficesCacheTtlSec,
  readSharedOfficesCache,
  serializeOfficesResult,
  writeSharedOfficesCache,
} from '@/lib/cdek-offices-cache'

describe('cdek-offices-cache', () => {
  afterEach(() => {
    clearSharedOfficesCacheForTests()
    delete process.env.CDEK_OFFICES_CACHE_TTL_SEC
  })

  it('builds stable shared cache keys per brand and query', () => {
    expect(
      buildSharedOfficesCacheKey({
        brandId: 'inner',
        cacheKey: '[["city_code",44],["page",0]]',
      })
    ).toBe('cdek:offices:v1:inner:[["city_code",44],["page",0]]')
  })

  it('reads and writes offices pages in memory cache', async () => {
    const cacheKey = '[["page",0],["size",500]]'
    const value = serializeOfficesResult({
      status: 200,
      text: JSON.stringify([{ code: 'MSK1' }]),
      responseHeaders: new Headers({ 'x-total-elements': '1' }),
    })

    await writeSharedOfficesCache({
      brandId: 'inner',
      cacheKey,
      value,
    })

    const cached = await readSharedOfficesCache({
      brandId: 'inner',
      cacheKey,
    })

    expect(cached).toEqual(value)
  })

  it('uses configurable ttl with safe fallback', () => {
    expect(getCdekOfficesCacheTtlSec()).toBe(6 * 60 * 60)
    process.env.CDEK_OFFICES_CACHE_TTL_SEC = '7200'
    expect(getCdekOfficesCacheTtlSec()).toBe(7200)
    process.env.CDEK_OFFICES_CACHE_TTL_SEC = 'invalid'
    expect(getCdekOfficesCacheTtlSec()).toBe(6 * 60 * 60)
  })
})
