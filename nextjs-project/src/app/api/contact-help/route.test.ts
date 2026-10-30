import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('server-only', () => ({}))

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: (fn: () => unknown) => {
      try {
        const result = fn()
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          void (result as Promise<unknown>).catch(() => {})
        }
      } catch {
        // ignore: tests assert on response, not background side-effects
      }
    },
  }
})

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 5, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => 'test-client'),
}))

vi.mock('@/services/contact-help.service', () => ({
  createContactHelpLead: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
  getAdminNotificationEmails: vi.fn(async () => ['admin@example.com']),
}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramForm: vi.fn(),
}))

vi.mock('@/lib/max-notify', () => ({
  notifyMaxForm: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendContactHelpNotification: vi.fn(async () => ({ ok: true })),
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

describe('POST /api/contact-help', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks disposable domains', async () => {
    const res = await POST(
      new Request('http://x/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
          name: 'John Doe',
          email: 'user@tempmail.com',
          phone: '+79991234567',
          message: 'Подскажите по доставке заказа',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Временные email адреса недопустимы' })
  })

  it('blocks non-resolvable domains', async () => {
    const res = await POST(
      new Request('http://x/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
          name: 'John Doe',
          email: 'user@nonexistent.invalid',
          phone: '+79991234567',
          message: 'Подскажите по доставке заказа',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Домен email не существует' })
  })

  it('requires minimum message length', async () => {
    const res = await POST(
      new Request('http://x/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
          name: 'John Doe',
          email: 'user@example.com',
          phone: '+79991234567',
          message: 'кор',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Вопрос: от 5 до 2000 символов.' })
  })

  it('requires email or phone', async () => {
    const res = await POST(
      new Request('http://x/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
          name: 'John Doe',
          email: '',
          phone: '',
          message: 'Нужна помощь с заказом',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Укажите email или номер телефона.' })
  })

  it('accepts email without phone', async () => {
    const { createContactHelpLead } = await import('@/services/contact-help.service')
    const res = await POST(
      new Request('http://x/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
          name: 'John Doe',
          email: 'user@example.com',
          phone: '',
          message: 'Нужна помощь с заказом',
        }),
      })
    )

    expect(res.status).toBe(200)
    expect(createContactHelpLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        phone: '',
      }),
      expect.anything()
    )
  })

  it('rejects incomplete phone numbers', async () => {
    const res = await POST(
      new Request('http://x/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '', formStartedAt: Date.now() - 5000,
          name: 'John Doe',
          email: '',
          phone: '+79',
          message: 'Нужна помощь с заказом',
        }),
      })
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Введите полный номер: +7 (999) 999-99-99',
    })
  })
})


describe.each(['innerhealth.ru', 'sprintpower.ru'])('public form protection on %s', host => {
  const valid = () => ({ name: 'Анна Иванова', email: 'user@gmail.com', phone: '+79991234567',
    message: 'Хочу узнать об условиях сотрудничества', socialLinks: '@anna',
    website: '', formStartedAt: Date.now() - 5000 })
  const submit = (patch: Record<string, unknown>) => POST(new Request(`https://${host}/api/contact-help`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', host },
    body: JSON.stringify({ ...valid(), ...patch }),
  }))
  beforeEach(() => vi.clearAllMocks())
  it.each([
    { name: 'wGLawnPlfyghyXWiNKXN' }, { phone: '5513734243' },
    { phone: '+79991234567 garbage' }, { phone: '+799912345670' }, { phone: 'garbage' }, { phone: '1' },
    { message: 'PiCaIKQUXcnnpGNFYKQWOlZ' }, { message: '<script>alert(1)</script>' },
    { message: 'x'.repeat(2001) }, { name: 'Анна'.repeat(40) }, { message: 123 },
  ])('rejects malformed field %# before saving or notifying', async patch => {
    expect((await submit(patch)).status).toBe(400)
    const service = await import('@/services/contact-help.service')
    expect(service.createContactHelpLead).not.toHaveBeenCalled()
    const { notifyTelegramForm } = await import('@/lib/telegram-notify')
    expect(notifyTelegramForm).not.toHaveBeenCalled()
  })
  it.each([{ website: 'spam' }, { formStartedAt: undefined }])('silently discards bot trap %#', async patch => {
    expect((await submit(patch)).status).toBe(200)
    const service = await import('@/services/contact-help.service')
    expect(service.createContactHelpLead).not.toHaveBeenCalled()
  })
  it('accepts valid leads with correct brand', async () => {
    expect((await submit({})).status).toBe(200)
    const service = await import('@/services/contact-help.service')
    expect(service.createContactHelpLead).toHaveBeenCalledWith(expect.objectContaining({name: 'Анна Иванова'}), host === 'sprintpower.ru' ? 'sprint-power' : 'inner')
  })
})


describe('request and repeat limits', () => {
  it.each(['null', '[]', '{broken'])('rejects malformed body %s', async body => {
    const res = await POST(new Request('http://x/api/contact-help', {method: 'POST', body}))
    expect(res.status).toBe(400)
  })
  it('does not save or notify when the repeat limit is exceeded', async () => {
    vi.clearAllMocks()
    const { checkRateLimit } = await import('@/lib/rate-limit')
    vi.mocked(checkRateLimit).mockResolvedValueOnce({success: true, remaining: 4, resetIn: 60})
      .mockResolvedValueOnce({success: false, remaining: 0, resetIn: 3600})
    const res = await POST(new Request('http://x/api/contact-help', {method: 'POST', body: JSON.stringify({
      name: 'Анна Иванова', email: 'user@gmail.com', phone: '+79991234567',
      message: 'Нужна помощь с заказом', website: '', formStartedAt: Date.now() - 5000,
    })}))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('3600')
    const service = await import('@/services/contact-help.service')
    expect(service.createContactHelpLead).not.toHaveBeenCalled()
    const { notifyTelegramForm } = await import('@/lib/telegram-notify')
    expect(notifyTelegramForm).not.toHaveBeenCalled()
  })
})

 it('returns a visible error for a valid visitor submitting too quickly', async () => {
    const response = await POST(new Request('http://x/api/contact-help', {method: 'POST', body: JSON.stringify({
      name: 'Анна', email: 'user@gmail.com', phone: '+79991234567', message: 'Нужна помощь с заказом',
      website: '', formStartedAt: Date.now(),
    })}))
    expect(response.status).toBe(400)
 })
