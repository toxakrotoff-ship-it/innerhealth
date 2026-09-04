const CACHE_KEY = 'cdek-country-offices-cache-v1'
const CACHE_VERSION = 1
const CACHE_TTL_MS = 4 * 60 * 60 * 1000

interface CountryOfficesCachePayload {
  version: number
  storedAt: number
  offices: unknown[]
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function readCountryOfficesCache(): unknown[] | null {
  const storage = getSessionStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CountryOfficesCachePayload>
    if (
      parsed.version !== CACHE_VERSION ||
      typeof parsed.storedAt !== 'number' ||
      !Array.isArray(parsed.offices)
    ) {
      return null
    }

    if (Date.now() - parsed.storedAt > CACHE_TTL_MS) return null

    return parsed.offices
  } catch {
    return null
  }
}

export function writeCountryOfficesCache(offices: unknown[]): void {
  const storage = getSessionStorage()
  if (!storage) return

  try {
    const payload: CountryOfficesCachePayload = {
      version: CACHE_VERSION,
      storedAt: Date.now(),
      offices,
    }
    storage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Best-effort: quota exceeded, private mode, or serialization failure — skip caching.
  }
}
