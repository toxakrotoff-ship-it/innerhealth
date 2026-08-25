import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from './route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true, remaining: 10, resetIn: 60 })),
  getClientIdentifier: vi.fn(() => 'test-client'),
}))

vi.mock('@/lib/checkout-session-request', () => ({
  resolveCheckoutOwnerFromRequest: vi.fn(),
}))

const updateCheckoutContactMock = vi.fn()

vi.mock('@/lib/checkout-tracking', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/checkout-tracking')>('@/lib/checkout-tracking')
  return {
    ...actual,
    updateCheckoutContact: (...args: unknown[]) => updateCheckoutContactMock(...args),
  }
})

const checkoutSessionRequest = await import('@/lib/checkout-session-request')
const rateLimit = await import('@/lib/rate-limit')

function patchRequest(body: unknown) {
  return new Request('http://x/api/checkout/session/sess-1/contact', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(rateLimit.checkRateLimit).mockResolvedValue({ success: true, remaining: 10, resetIn: 60 })
  vi.mocked(checkoutSessionRequest.resolveCheckoutOwnerFromRequest).mockResolvedValue({
    guestToken: 'tok-1',
    userId: null,
  })
})

describe('PATCH /api/checkout/session/[id]/contact', () => {
  it('saves the contact for an owned session', async () => {
    updateCheckoutContactMock.mockResolvedValue({ id: 'sess-1' })

    const res = await PATCH(patchRequest({ phone: '+79990000000' }), {
      params: Promise.resolve({ id: 'sess-1' }),
    })

    expect(res.status).toBe(200)
    expect(updateCheckoutContactMock).toHaveBeenCalledWith(
      'sess-1',
      { guestToken: 'tok-1', userId: null },
      { phone: '+79990000000' }
    )
  })

  it('returns 404 without confirming existence when the session belongs to another guest', async () => {
    const { CheckoutSessionNotFoundError } = await import('@/lib/checkout-tracking')
    updateCheckoutContactMock.mockRejectedValue(new CheckoutSessionNotFoundError())

    const res = await PATCH(patchRequest({ phone: '+79990000000' }), {
      params: Promise.resolve({ id: 'someone-elses-session' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid body', async () => {
    const res = await PATCH(patchRequest({ phone: 123 }), {
      params: Promise.resolve({ id: 'sess-1' }),
    })

    expect(res.status).toBe(400)
    expect(updateCheckoutContactMock).not.toHaveBeenCalled()
  })

  it('returns 429 when rate-limited', async () => {
    vi.mocked(rateLimit.checkRateLimit).mockResolvedValue({ success: false, remaining: 0, resetIn: 30 })

    const res = await PATCH(patchRequest({ phone: '+79990000000' }), {
      params: Promise.resolve({ id: 'sess-1' }),
    })

    expect(res.status).toBe(429)
    expect(updateCheckoutContactMock).not.toHaveBeenCalled()
  })
})
