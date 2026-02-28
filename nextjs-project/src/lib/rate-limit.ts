/**
 * Rate limiter with optional Upstash Redis backend.
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, uses Redis.
 * Otherwise (or on Redis error) falls back to in-memory store.
 */

const defaultWindowMs = 60 * 1000;
const defaultMaxRequests = 30;

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

function memoryCleanup(): void {
  const now = Date.now();
  for (const [key, data] of Array.from(memoryStore.entries())) {
    if (data.resetAt < now) memoryStore.delete(key);
  }
}

function memoryCheck(
  identifier: string,
  prefix: string,
  max: number,
  window: number
): { success: boolean; remaining: number; resetIn: number } {
  if (memoryStore.size > 10000) memoryCleanup();
  const key = memoryKey(identifier, prefix);
  const now = Date.now();
  let data = memoryStore.get(key);
  if (!data || data.resetAt < now) {
    data = { count: 0, resetAt: now + window };
    memoryStore.set(key, data);
  }
  data.count += 1;
  const overLimit = data.count > max;
  return {
    success: !overLimit,
    remaining: Math.max(0, max - data.count),
    resetIn: Math.ceil((data.resetAt - now) / 1000),
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token && url.trim() && token.trim());
}

async function redisCheck(
  identifier: string,
  prefix: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const now = Date.now();
  const slot = Math.floor(now / windowMs);
  const key = `rl:${prefix}:${identifier}:${slot}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    const pipelineUrl = url.endsWith("/") ? `${url}pipeline` : `${url}/pipeline`;
    const res = await fetch(pipelineUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec)],
        ["TTL", key],
      ]),
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ result?: number | string; error?: string }>;
    const count = typeof results[0]?.result === "number" ? results[0].result : 0;
    const ttl = typeof results[2]?.result === "number" ? results[2].result : windowSec;
    const overLimit = count > max;
    return {
      success: !overLimit,
      remaining: Math.max(0, max - count),
      resetIn: ttl > 0 ? ttl : windowSec,
    };
  } catch {
    return null;
  }
}

/**
 * Check rate limit for identifier (e.g. IP). Returns success: false if over limit.
 * Uses Upstash Redis when configured, otherwise in-memory. On Redis error, falls back to in-memory.
 */
export async function checkRateLimit(
  identifier: string,
  prefix: string,
  max: number = defaultMaxRequests,
  window: number = defaultWindowMs
): Promise<RateLimitResult> {
  if (isRedisConfigured()) {
    const redisResult = await redisCheck(identifier, prefix, max, window);
    if (redisResult !== null) return redisResult;
  }
  return memoryCheck(identifier, prefix, max, window);
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return ip;
}
