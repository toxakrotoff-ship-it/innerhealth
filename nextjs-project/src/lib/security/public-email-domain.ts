import 'server-only'
import { promises as dnsPromises } from 'dns'
import { isEmail } from 'validator'
import { extractEmailDomain, getEmailRiskVerdict } from './email-risk'

export interface EmailDomainDnsResolver {
  resolveMx: (domain: string) => Promise<Array<{ exchange: string; priority: number }>>
  resolveA: (domain: string) => Promise<string[]>
}

export type PublicEmailDomainReason =
  | 'allow'
  | 'invalid_syntax'
  | 'disposable_domain'
  | 'domain_not_resolvable'
  | 'dns_unknown'

export interface PublicEmailDomainValidationResult {
  valid: boolean
  reason: PublicEmailDomainReason
  userMessage: string
  shouldHideReason: boolean
}

type DnsLookupOutcome =
  | { kind: 'found' }
  | { kind: 'missing' }
  | { kind: 'unknown' }

type CachedValidation = {
  result: PublicEmailDomainValidationResult
  expiresAt: number
}

const DEFAULT_TIMEOUT_MS = 1500
const CACHE_TTL_MS = 60 * 60 * 1000
const NON_RESOLVABLE_ERROR_CODES = new Set(['ENOTFOUND', 'ENODATA', 'DNS_ENOTFOUND', 'DNS_ENODATA'])
const cache = new Map<string, CachedValidation>()

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function buildResult(
  reason: PublicEmailDomainReason,
  overrides?: Partial<Pick<PublicEmailDomainValidationResult, 'shouldHideReason' | 'userMessage'>>
): PublicEmailDomainValidationResult {
  switch (reason) {
    case 'allow':
      return {
        valid: true,
        reason,
        userMessage: '',
        shouldHideReason: false,
        ...overrides,
      }
    case 'invalid_syntax':
      return {
        valid: false,
        reason,
        userMessage: 'Некорректный email',
        shouldHideReason: false,
        ...overrides,
      }
    case 'disposable_domain':
      return {
        valid: false,
        reason,
        userMessage: 'Временные email адреса недопустимы',
        shouldHideReason: false,
        ...overrides,
      }
    case 'domain_not_resolvable':
      return {
        valid: false,
        reason,
        userMessage: 'Домен email не существует',
        shouldHideReason: false,
        ...overrides,
      }
    case 'dns_unknown':
      return {
        valid: true,
        reason,
        userMessage: '',
        shouldHideReason: false,
        ...overrides,
      }
  }
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

async function checkDnsRecords(
  resolve: Promise<unknown[]>,
  timeoutMs: number
): Promise<DnsLookupOutcome> {
  try {
    const records = await withTimeout(resolve, timeoutMs)
    return records.length > 0 ? { kind: 'found' } : { kind: 'missing' }
  } catch (error) {
    const code = getErrorCode(error)
    if (code && NON_RESOLVABLE_ERROR_CODES.has(code)) {
      return { kind: 'missing' }
    }
    return { kind: 'unknown' }
  }
}

export async function validatePublicEmailDomain(
  email: string,
  options?: {
    dns?: EmailDomainDnsResolver
    timeoutMs?: number
    hideReason?: boolean
  }
): Promise<PublicEmailDomainValidationResult> {
  const trimmed = email.trim()
  if (
    !isEmail(trimmed, {
      require_tld: true,
      allow_utf8_local_part: false,
      allow_smtputf8: false,
    })
  ) {
    return buildResult('invalid_syntax', { shouldHideReason: options?.hideReason ?? false })
  }

  if (getEmailRiskVerdict(trimmed) === 'block') {
    return buildResult('disposable_domain', { shouldHideReason: options?.hideReason ?? false })
  }

  const domain = extractEmailDomain(trimmed)
  if (!domain) {
    return buildResult('invalid_syntax', { shouldHideReason: options?.hideReason ?? false })
  }

  const shouldUseCache = options?.dns == null
  if (shouldUseCache) {
    const cached = cache.get(domain)
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.result,
        shouldHideReason: options?.hideReason ?? cached.result.shouldHideReason,
      }
    }
  }

  const dns: EmailDomainDnsResolver =
    options?.dns ??
    ({
      resolveMx: async (value: string) => dnsPromises.resolveMx(value),
      resolveA: async (value: string) => dnsPromises.resolve4(value),
    } satisfies EmailDomainDnsResolver)
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const mxOutcome = await checkDnsRecords(dns.resolveMx(domain), timeoutMs)
  if (mxOutcome.kind === 'found') {
    const result = buildResult('allow', { shouldHideReason: options?.hideReason ?? false })
    if (shouldUseCache) {
      cache.set(domain, { result, expiresAt: Date.now() + CACHE_TTL_MS })
    }
    return result
  }

  const aOutcome = await checkDnsRecords(dns.resolveA(domain), timeoutMs)
  const result =
    aOutcome.kind === 'found'
      ? buildResult('allow', { shouldHideReason: options?.hideReason ?? false })
      : mxOutcome.kind === 'missing' && aOutcome.kind === 'missing'
        ? buildResult('domain_not_resolvable', { shouldHideReason: options?.hideReason ?? false })
        : buildResult('dns_unknown', { shouldHideReason: options?.hideReason ?? false })

  if (shouldUseCache) {
    cache.set(domain, { result, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  return result
}

export function __resetPublicEmailDomainValidationCacheForTests(): void {
  cache.clear()
}
