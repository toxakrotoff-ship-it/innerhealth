/**
 * In-memory rate limiter. For production with multiple instances use Upstash Redis.
 * Set env UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to use Upstash.
 */

const windowMs = 60 * 1000 // 1 minute
const maxRequests = 30 // e.g. 30 promo checks per minute per IP

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`
}

function cleanup(): void {
  const now = Date.now()
  for (const [key, data] of store.entries()) {
    if (data.resetAt < now) store.delete(key)
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
}

/**
 * Check rate limit for identifier (e.g. IP). Returns success: false if over limit.
 */
export function checkRateLimit(
  identifier: string,
  prefix: string,
  max: number = maxRequests,
  window: number = windowMs
): RateLimitResult {
  if (store.size > 10000) cleanup()
  const key = getKey(identifier, prefix)
  const now = Date.now()
  let data = store.get(key)
  if (!data || data.resetAt < now) {
    data = { count: 0, resetAt: now + window }
    store.set(key, data)
  }
  data.count += 1
  const overLimit = data.count > max
  return {
    success: !overLimit,
    remaining: Math.max(0, max - data.count),
    resetIn: Math.ceil((data.resetAt - now) / 1000),
  }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  return ip
}
