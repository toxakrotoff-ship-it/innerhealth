import { promises as dnsPromises } from 'dns'
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import {
  __resetPublicEmailDomainValidationCacheForTests,
  validatePublicEmailDomain,
  type EmailDomainDnsResolver,
} from './public-email-domain'

describe('public-email-domain', () => {
  beforeEach(() => {
    __resetPublicEmailDomainValidationCacheForTests()
  })

  it('allows a normal domain with MX records', async () => {
    const dns: EmailDomainDnsResolver = {
      resolveMx: async () => [{ exchange: 'mx.example.com', priority: 10 }],
      resolveA: async () => [],
    }

    const result = await validatePublicEmailDomain('user@example.com', { dns })
    expect(result).toMatchObject({ valid: true, reason: 'allow' })
  })

  it('blocks disposable domains', async () => {
    const dns: EmailDomainDnsResolver = {
      resolveMx: async () => [{ exchange: 'mx.temp', priority: 10 }],
      resolveA: async () => ['127.0.0.1'],
    }

    const result = await validatePublicEmailDomain('user@tempmail.com', { dns })
    expect(result).toMatchObject({ valid: false, reason: 'disposable_domain' })
  })

  it('blocks domains without MX and A records', async () => {
    const dns: EmailDomainDnsResolver = {
      resolveMx: async () => [],
      resolveA: async () => [],
    }

    const result = await validatePublicEmailDomain('user@nonexistent.invalid', { dns })
    expect(result).toMatchObject({ valid: false, reason: 'domain_not_resolvable' })
  })

  it('normalizes uppercase and mixed-case email domains', async () => {
    const dns: EmailDomainDnsResolver = {
      resolveMx: async () => [{ exchange: 'mx.example.com', priority: 10 }],
      resolveA: async () => [],
    }

    const result = await validatePublicEmailDomain('User@Example.COM', { dns })
    expect(result).toMatchObject({ valid: true, reason: 'allow' })
  })

  it('returns dns_unknown for timeout and follows fail-open behavior', async () => {
    const dns: EmailDomainDnsResolver = {
      resolveMx: async () => {
        throw new Error('timeout')
      },
      resolveA: async () => {
        throw new Error('temporary dns issue')
      },
    }

    const result = await validatePublicEmailDomain('user@example.com', { dns, timeoutMs: 10 })
    expect(result).toMatchObject({ valid: true, reason: 'dns_unknown' })
  })

  it('uses cache for repeated domain checks', async () => {
    const resolveMx = vi.spyOn(dnsPromises, 'resolveMx').mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }])
    const resolveA = vi.spyOn(dnsPromises, 'resolve4').mockResolvedValue([])

    await validatePublicEmailDomain('first@example.com')
    await validatePublicEmailDomain('second@example.com')

    expect(resolveMx).toHaveBeenCalledTimes(1)
    expect(resolveA).toHaveBeenCalledTimes(0)
  })
})
