export interface CdekOfficesCachedResult {
  status: number
  text: string
  responseHeaders: Record<string, string>
}

const DEFAULT_TTL_SEC = 6 * 60 * 60
const MEMORY_MAX_ENTRIES = 256

type MemoryEntry = {
  expiresAt: number
  value: CdekOfficesCachedResult
}

const memoryStore = new Map<string, MemoryEntry>()

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  return Boolean(url && token)
}

export function getCdekOfficesCacheTtlSec(): number {
  const raw = process.env.CDEK_OFFICES_CACHE_TTL_SEC?.trim()
  if (!raw) return DEFAULT_TTL_SEC
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SEC
}

export function buildSharedOfficesCacheKey(params: {
  brandId: string | null
  cacheKey: string
}): string {
  return `cdek:offices:v1:${params.brandId ?? 'default'}:${params.cacheKey}`
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

export function serializeOfficesResult(result: {
  status: number
  text: string
  responseHeaders: Headers
}): CdekOfficesCachedResult {
  return {
    status: result.status,
    text: result.text,
    responseHeaders: headersToRecord(result.responseHeaders),
  }
}

export function deserializeOfficesResult(cached: CdekOfficesCachedResult): {
  status: number
  text: string
  responseHeaders: Headers
} {
  return {
    status: cached.status,
    text: cached.text,
    responseHeaders: new Headers(cached.responseHeaders),
  }
}

function readMemoryCache(key: string): CdekOfficesCachedResult | null {
  const cached = memoryStore.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return cached.value
}

function writeMemoryCache(key: string, value: CdekOfficesCachedResult, ttlSec: number): void {
  if (memoryStore.size >= MEMORY_MAX_ENTRIES) {
    const now = Date.now()
    for (const [entryKey, entry] of Array.from(memoryStore.entries())) {
      if (entry.expiresAt <= now) memoryStore.delete(entryKey)
      if (memoryStore.size < MEMORY_MAX_ENTRIES) break
    }
    if (memoryStore.size >= MEMORY_MAX_ENTRIES) {
      const oldestKey = memoryStore.keys().next().value
      if (oldestKey) memoryStore.delete(oldestKey)
    }
  }

  memoryStore.set(key, {
    expiresAt: Date.now() + ttlSec * 1000,
    value,
  })
}

async function redisGet(key: string): Promise<CdekOfficesCachedResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null

  try {
    const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return null

    const payload = (await response.json()) as { result?: string | null }
    if (!payload.result) return null

    return JSON.parse(payload.result) as CdekOfficesCachedResult
  } catch {
    return null
  }
}

async function redisSet(key: string, value: CdekOfficesCachedResult, ttlSec: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return false

  try {
    const pipelineUrl = url.endsWith('/') ? `${url}pipeline` : `${url}/pipeline`
    const response = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([['SET', key, JSON.stringify(value), 'EX', String(ttlSec)]]),
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function readSharedOfficesCache(params: {
  brandId: string | null
  cacheKey: string
}): Promise<CdekOfficesCachedResult | null> {
  const sharedKey = buildSharedOfficesCacheKey(params)

  const fromMemory = readMemoryCache(sharedKey)
  if (fromMemory) return fromMemory

  if (!isRedisConfigured()) return null

  const fromRedis = await redisGet(sharedKey)
  if (!fromRedis) return null

  writeMemoryCache(sharedKey, fromRedis, getCdekOfficesCacheTtlSec())
  return fromRedis
}

export async function writeSharedOfficesCache(params: {
  brandId: string | null
  cacheKey: string
  value: CdekOfficesCachedResult
}): Promise<void> {
  const sharedKey = buildSharedOfficesCacheKey(params)
  const ttlSec = getCdekOfficesCacheTtlSec()

  writeMemoryCache(sharedKey, params.value, ttlSec)
  await redisSet(sharedKey, params.value, ttlSec)
}

export function clearSharedOfficesCacheForTests(): void {
  memoryStore.clear()
}
