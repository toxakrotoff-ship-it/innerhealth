import { afterEach, describe, expect, it, vi } from 'vitest'
import { readCountryOfficesCache, writeCountryOfficesCache } from '@/lib/cdek-widget-offices-client-cache'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('cdek-widget-offices-client-cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns null when window is unavailable (SSR / node test env)', () => {
    expect(readCountryOfficesCache()).toBeNull()
    expect(() => writeCountryOfficesCache([{ code: 'A1' }])).not.toThrow()
  })

  it('round-trips a written cache entry', () => {
    const storage = createMemoryStorage()
    vi.stubGlobal('window', { sessionStorage: storage })

    writeCountryOfficesCache([{ code: 'A1' }, { code: 'A2' }])
    const result = readCountryOfficesCache()

    expect(result).toEqual([{ code: 'A1' }, { code: 'A2' }])
  })

  it('returns null for a missing entry', () => {
    vi.stubGlobal('window', { sessionStorage: createMemoryStorage() })
    expect(readCountryOfficesCache()).toBeNull()
  })

  it('returns null for a corrupted entry', () => {
    const storage = createMemoryStorage()
    storage.setItem('cdek-country-offices-cache-v1', '{not json')
    vi.stubGlobal('window', { sessionStorage: storage })

    expect(readCountryOfficesCache()).toBeNull()
  })

  it('returns null for an entry from a different cache version', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'cdek-country-offices-cache-v1',
      JSON.stringify({ version: 999, storedAt: Date.now(), offices: [{ code: 'A1' }] })
    )
    vi.stubGlobal('window', { sessionStorage: storage })

    expect(readCountryOfficesCache()).toBeNull()
  })

  it('returns null once the entry is older than the TTL', () => {
    const storage = createMemoryStorage()
    vi.stubGlobal('window', { sessionStorage: storage })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    writeCountryOfficesCache([{ code: 'A1' }])

    vi.setSystemTime(new Date('2026-01-01T05:00:00Z'))
    expect(readCountryOfficesCache()).toBeNull()
  })

  it('does not throw when sessionStorage access itself throws (private mode)', () => {
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('SecurityError')
      },
    })

    expect(readCountryOfficesCache()).toBeNull()
    expect(() => writeCountryOfficesCache([{ code: 'A1' }])).not.toThrow()
  })
})
