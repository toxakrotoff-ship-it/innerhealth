import { promises as dnsPromises } from 'dns'
import { isEmail } from 'validator'
import { extractEmailDomain, getEmailRiskVerdict, type EmailRiskVerdict } from './email-risk'

export interface EmailRealityDnsResolver {
  resolveMx: (domain: string) => Promise<Array<{ exchange: string; priority: number }>>
  resolveA: (domain: string) => Promise<string[]>
}

export type EmailRealityResult = { valid: true } | { valid: false; message: string }

const DEFAULT_TIMEOUT_MS = 1500

type CachedEmailReality = {
  result: EmailRealityResult
  expiresAt: number
}

const DOMAIN_REALITY_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const domainRealityCache = new Map<string, CachedEmailReality>()

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    promise
      .then((v) => {
        clearTimeout(t)
        resolve(v)
      })
      .catch((e: unknown) => {
        clearTimeout(t)
        reject(e)
      })
  })
}

function getErrorMessage(verdict: EmailRiskVerdict): string {
  if (verdict === 'block') return 'Временные email адреса недопустимы'
  return 'Некорректный email'
}

export async function validateEmailReality(
  email: string,
  options?: {
    dns?: EmailRealityDnsResolver
    timeoutMs?: number
  }
): Promise<EmailRealityResult> {
  const trimmed = email.trim()
  if (
    !isEmail(trimmed, {
      require_tld: true,
      allow_utf8_local_part: false,
      allow_smtputf8: false,
    })
  ) {
    return { valid: false, message: 'Некорректный email' }
  }

  const verdict = getEmailRiskVerdict(trimmed)
  if (verdict !== 'allow') {
    return { valid: false, message: getErrorMessage(verdict) }
  }

  const domain = extractEmailDomain(trimmed)
  if (!domain) return { valid: false, message: 'Некорректный email' }

  const shouldUseCache = options?.dns == null
  if (shouldUseCache) {
    const cached = domainRealityCache.get(domain)
    if (cached && cached.expiresAt > Date.now()) return cached.result
  }

  const dns: EmailRealityDnsResolver =
    options?.dns ??
    ({
      resolveMx: async (d: string) => dnsPromises.resolveMx(d),
      resolveA: async (d: string) => dnsPromises.resolve4(d),
    } satisfies EmailRealityDnsResolver)

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const mx = await withTimeout(dns.resolveMx(domain), timeoutMs)
    if (mx.length > 0) {
      const result: EmailRealityResult = { valid: true }
      if (shouldUseCache) {
        domainRealityCache.set(domain, { result, expiresAt: Date.now() + DOMAIN_REALITY_CACHE_TTL_MS })
      }
      return result
    }
  } catch {
    // ignore and fall back to A-records
  }

  try {
    const a = await withTimeout(dns.resolveA(domain), timeoutMs)
    if (a.length > 0) {
      const result: EmailRealityResult = { valid: true }
      if (shouldUseCache) {
        domainRealityCache.set(domain, { result, expiresAt: Date.now() + DOMAIN_REALITY_CACHE_TTL_MS })
      }
      return result
    }
  } catch {
    // ignore
  }

  const result: EmailRealityResult = { valid: false, message: 'Домен email не существует' }
  if (shouldUseCache) {
    domainRealityCache.set(domain, { result, expiresAt: Date.now() + DOMAIN_REALITY_CACHE_TTL_MS })
  }
  return result
}

