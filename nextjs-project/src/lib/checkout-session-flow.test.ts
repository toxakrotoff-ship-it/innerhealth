import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const findSessionByIdMock = vi.fn()
const updateSessionStatusMock = vi.fn()
const createEventMock = vi.fn()
const updateSessionStepMock = vi.fn()
const updateSessionPaymentMock = vi.fn()

vi.mock('@/services/checkout-session.service', () => ({
  findSessionById: (...args: unknown[]) => findSessionByIdMock(...args),
  updateSessionStatus: (...args: unknown[]) => updateSessionStatusMock(...args),
  createEvent: (...args: unknown[]) => createEventMock(...args),
  updateSessionStep: (...args: unknown[]) => updateSessionStepMock(...args),
  updateSessionPayment: (...args: unknown[]) => updateSessionPaymentMock(...args),
}))

beforeEach(() => {
  findSessionByIdMock.mockReset()
  updateSessionStatusMock.mockReset()
  createEventMock.mockReset()
  updateSessionStepMock.mockReset()
  updateSessionPaymentMock.mockReset()
})

describe('transitionCheckoutToPaymentSucceeded', () => {
  it('marks the session COMPLETED and records both events on the first call', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', status: 'ACTIVE' })

    const { transitionCheckoutToPaymentSucceeded } = await import('@/lib/checkout-session-flow')
    const result = await transitionCheckoutToPaymentSucceeded('sess-1', 'webhook')

    expect(result).toEqual({ changed: true })
    expect(updateSessionStatusMock).toHaveBeenCalledWith('sess-1', 'COMPLETED')
    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'PAYMENT_SUCCEEDED', 'COMPLETED', {
      source: 'webhook',
    })
    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'CHECKOUT_COMPLETED', 'COMPLETED', {
      source: 'webhook',
    })
  })

  it('is idempotent: a duplicate webhook call on an already-COMPLETED session changes nothing', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', status: 'COMPLETED' })

    const { transitionCheckoutToPaymentSucceeded } = await import('@/lib/checkout-session-flow')
    const result = await transitionCheckoutToPaymentSucceeded('sess-1', 'webhook')

    expect(result).toEqual({ changed: false })
    expect(updateSessionStatusMock).not.toHaveBeenCalled()
    expect(createEventMock).not.toHaveBeenCalled()
  })
})

describe('transitionCheckoutToPaymentFailed', () => {
  it('marks the session PAYMENT_FAILED with whitelisted error metadata', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', status: 'ACTIVE' })

    const { transitionCheckoutToPaymentFailed } = await import('@/lib/checkout-session-flow')
    const result = await transitionCheckoutToPaymentFailed('sess-1', 'webhook', {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Недостаточно средств на карте',
      providerStatus: 'bank',
    })

    expect(result).toEqual({ changed: true })
    expect(updateSessionStatusMock).toHaveBeenCalledWith('sess-1', 'PAYMENT_FAILED')
    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'PAYMENT_FAILED', null, {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Недостаточно средств на карте',
      providerStatus: 'bank',
      source: 'webhook',
    })
  })

  it('does not fire twice for an already PAYMENT_FAILED session', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', status: 'PAYMENT_FAILED' })

    const { transitionCheckoutToPaymentFailed } = await import('@/lib/checkout-session-flow')
    const result = await transitionCheckoutToPaymentFailed('sess-1', 'cron-scan', {
      code: 'X',
      message: 'Y',
    })

    expect(result).toEqual({ changed: false })
    expect(updateSessionStatusMock).not.toHaveBeenCalled()
  })
})

describe('trackPaymentCallback', () => {
  it('never stores the raw payload, only the whitelisted status', async () => {
    const { trackPaymentCallback } = await import('@/lib/checkout-session-flow')
    await trackPaymentCallback('sess-1', 'webhook', {
      status: 'canceled',
      raw: { payment_method: { card: { first6: '411111', last4: '1111' } }, secret: 'nope' },
    })

    const metadata = createEventMock.mock.calls[0][3]
    expect(metadata).toEqual({ status: 'canceled', source: 'webhook' })
    expect(JSON.stringify(metadata)).not.toMatch(/card|secret|411111/i)
  })
})
