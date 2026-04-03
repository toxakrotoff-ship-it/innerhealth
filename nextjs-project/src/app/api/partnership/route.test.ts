import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 5, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => 'test-client'),
}))

vi.mock('@/services/partnership.service', () => ({
  createPartnershipLead: vi.fn(),
}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramForm: vi.fn(),
}))

vi.mock('@/lib/max-notify', () => ({
  notifyMaxForm: vi.fn(),
}))

vi.mock('@/lib/security/public-email-domain', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/public-email-domain')>('@/lib/security/public-email-domain')
  return {
    ...actual,
    validatePublicEmailDomain: vi.fn(async (email: string) => {
      if (email.includes('@nonexistent.invalid')) {
        return {
          valid: false,
          reason: 'domain_not_resolvable',
          userMessage: 'Домен email не существует',
          shouldHideReason: false,
        }
      }
      return actual.validatePublicEmailDomain(email)
    }),
  }
})

describe('POST /api/partnership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks disposable domains', async () => {
    const res = await POST(
      new Request('http://x/api/partnership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'user@tempmail.com',
          phone: '+79991234567',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Временные email адреса недопустимы' })
  })

  it('blocks non-resolvable domains', async () => {
    const res = await POST(
      new Request('http://x/api/partnership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'user@nonexistent.invalid',
          phone: '+79991234567',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Домен email не существует' })
  })
})
