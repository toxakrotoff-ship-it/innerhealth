import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('server-only', () => ({}))
vi.mock('next/server', async () => ({ ...await vi.importActual<typeof import('next/server')>('next/server'), after: vi.fn() }))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 5, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => 'test-client'),
}))

vi.mock('@/services/b2b.service', () => ({
  createB2bLead: vi.fn(),
}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramForm: vi.fn(),
}))

vi.mock('@/lib/email', () => ({ sendB2bLeadNotification: vi.fn() }))
vi.mock('@/services/user.service', () => ({ getAdminNotificationEmails: vi.fn(async () => []) }))

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

describe('POST /api/b2b', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks disposable domains', async () => {
    const res = await POST(
      new Request('http://x/api/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
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
      new Request('http://x/api/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
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


describe.each(['innerhealth.ru', 'sprintpower.ru'])('public form protection on %s', host => {
  const valid = () => ({ format: 'Специалист', name: 'Анна Иванова', email: 'user@gmail.com', phone: '+79991234567',
    message: 'Хочу узнать об условиях сотрудничества', socialLinks: '@anna',
    website: '', formStartedAt: Date.now() - 5000 })
  const submit = (patch: Record<string, unknown>) => POST(new Request(`https://${host}/api/b2b`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', host },
    body: JSON.stringify({ ...valid(), ...patch }),
  }))
  beforeEach(() => vi.clearAllMocks())
  it.each([
    { name: 'wGLawnPlfyghyXWiNKXN' }, { phone: '5513734243' },
    { phone: '+79991234567 garbage' }, { phone: '+799912345670' },
    { name: 'Анна'.repeat(40) }, { format: 'invalid' }, { city: 123 },
  ])('rejects malformed field %# before saving or notifying', async patch => {
    expect((await submit(patch)).status).toBe(400)
    const service = await import('@/services/b2b.service')
    expect(service.createB2bLead).not.toHaveBeenCalled()
    const { notifyTelegramForm } = await import('@/lib/telegram-notify')
    expect(notifyTelegramForm).not.toHaveBeenCalled()
  })
  it.each([{ website: 'spam' }, { formStartedAt: undefined }])('silently discards bot trap %#', async patch => {
    expect((await submit(patch)).status).toBe(200)
    const service = await import('@/services/b2b.service')
    expect(service.createB2bLead).not.toHaveBeenCalled()
  })
  it('accepts valid leads with correct brand', async () => {
    expect((await submit({})).status).toBe(200)
    const service = await import('@/services/b2b.service')
    expect(service.createB2bLead).toHaveBeenCalledWith(expect.objectContaining({name: 'Анна Иванова'}), host === 'sprintpower.ru' ? 'sprint-power' : 'inner')
  })
})

describe('request and repeat limits', () => {
  it.each(['null', '[]', '{broken'])('rejects malformed body %s', async body => {
    const res = await POST(new Request('http://x/api/b2b', {method: 'POST', body}))
    expect(res.status).toBe(400)
  })
  it('does not save or notify when the repeat limit is exceeded', async () => {
    vi.clearAllMocks()
    const { checkRateLimit } = await import('@/lib/rate-limit')
    vi.mocked(checkRateLimit).mockResolvedValueOnce({success: true, remaining: 4, resetIn: 60})
      .mockResolvedValueOnce({success: false, remaining: 0, resetIn: 3600})
    const res = await POST(new Request('http://x/api/b2b', {method: 'POST', body: JSON.stringify({
      format: 'Специалист', name: 'Анна Иванова', email: 'user@gmail.com', phone: '+79991234567',
      message: 'Нужна помощь с заказом', website: '', formStartedAt: Date.now() - 5000,
    })}))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('3600')
    const service = await import('@/services/b2b.service')
    expect(service.createB2bLead).not.toHaveBeenCalled()
    const { notifyTelegramForm } = await import('@/lib/telegram-notify')
    expect(notifyTelegramForm).not.toHaveBeenCalled()
  })
})

 it('returns a visible error for a valid visitor submitting too quickly', async () => {
    const response = await POST(new Request('http://x/api/b2b', {method: 'POST', body: JSON.stringify({
      name: 'Анна', email: 'user@gmail.com', phone: '+79991234567', message: 'Нужна помощь с заказом',
      website: '', formStartedAt: Date.now(),
    })}))
    expect(response.status).toBe(400)
 })
