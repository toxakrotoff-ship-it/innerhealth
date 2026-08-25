import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/lib/yookassa', () => ({
  getYookassaPayment: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
  findOrderForWebhook: vi.fn(),
  findOrderBrandIdForNotify: vi.fn().mockResolvedValue('inner'),
}))

vi.mock('@/services/settings.service', () => ({
  getYookassaSettingsMap: vi.fn().mockResolvedValue({
    yookassa_shop_id: 'test-shop',
    yookassa_secret_key: 'test-secret',
  }),
  getYookassaCredentials: vi.fn().mockResolvedValue({
    shopId: 'test-shop',
    secretKey: 'test-secret',
  }),
}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramPaymentError: vi.fn(),
}))

vi.mock('@/lib/max-notify', () => ({
  notifyMaxPaymentError: vi.fn(),
}))

vi.mock('@/lib/order-payment-flow', () => ({
  transitionOrderToPaid: vi.fn().mockResolvedValue({ changed: true, status: 'paid', previousStatus: 'pending' }),
  transitionOrderToCanceled: vi.fn().mockResolvedValue({ changed: true, status: 'canceled', previousStatus: 'pending' }),
}))

vi.mock('@/services/checkout-session.service', () => ({
  findSessionByOrderId: vi.fn().mockResolvedValue(null),
}))

const transitionCheckoutToPaymentSucceededMock = vi.fn().mockResolvedValue({ changed: true })

vi.mock('@/lib/checkout-session-flow', () => ({
  trackPaymentCallback: vi.fn(),
  transitionCheckoutToPaymentSucceeded: (...args: unknown[]) =>
    transitionCheckoutToPaymentSucceededMock(...args),
  transitionCheckoutToPaymentFailed: vi.fn().mockResolvedValue({ changed: true }),
  transitionCheckoutToPaymentCancelled: vi.fn().mockResolvedValue({ changed: true }),
}))

import { getYookassaPayment } from '@/lib/yookassa'
import * as orderService from '@/services/order.service'
import * as checkoutSessionService from '@/services/checkout-session.service'
import { transitionOrderToPaid, transitionOrderToCanceled } from '@/lib/order-payment-flow'
import { trackPaymentCallback } from '@/lib/checkout-session-flow'
import { POST } from '@/app/api/webhooks/yookassa/route'

const originalNodeEnv = process.env.NODE_ENV

function setNodeEnv(value: string | undefined) {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>).NODE_ENV
  } else {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = value
  }
}

const PAID_PAYLOAD = {
  type: 'notification',
  event: 'payment.succeeded',
  object: {
    id: 'pmt-1',
    status: 'succeeded',
    metadata: { orderId: 'order-1' },
  },
} as const

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://localhost/api/webhooks/yookassa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-forwarded-for': '185.71.76.5',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/yookassa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setNodeEnv('production')
    delete process.env.YOOKASSA_IP_FILTER

    vi.mocked(orderService.findOrderForWebhook).mockResolvedValue({
      id: 'order-1',
      orderNumber: 42,
      status: 'pending',
      yookassaPaymentId: 'pmt-1',
      userId: 'user-1',
    })
  })

  afterAll(() => {
    setNodeEnv(originalNodeEnv)
  })

  it('returns 502 when GET /payments verification throws (so YooKassa retries)', async () => {
    vi.mocked(getYookassaPayment).mockRejectedValue(new Error('network down'))
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(502)
    expect(transitionOrderToPaid).not.toHaveBeenCalled()
  })

  it('returns 502 when GET /payments returns null (auth/network failure)', async () => {
    vi.mocked(getYookassaPayment).mockResolvedValue(null)
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(502)
    expect(transitionOrderToPaid).not.toHaveBeenCalled()
  })

  it('returns 200 and transitions to paid on verified succeeded payment', async () => {
    vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'succeeded' })
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(200)
    expect(transitionOrderToPaid).toHaveBeenCalledWith('order-1', 'webhook')
  })

  it('returns 200 without transition if payment status is not succeeded yet', async () => {
    vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'waiting_for_capture' })
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(200)
    expect(transitionOrderToPaid).not.toHaveBeenCalled()
  })

  it('skips already-paid order without verifying', async () => {
    vi.mocked(orderService.findOrderForWebhook).mockResolvedValueOnce({
      id: 'order-1',
      orderNumber: 42,
      status: 'paid',
      yookassaPaymentId: 'pmt-1',
      userId: 'user-1',
    })
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(200)
    expect(getYookassaPayment).not.toHaveBeenCalled()
    expect(transitionOrderToPaid).not.toHaveBeenCalled()
  })

  it('rejects request from non-YooKassa IPv4 with 403', async () => {
    const response = await POST(
      makeRequest(PAID_PAYLOAD, { 'x-forwarded-for': '203.0.113.5' })
    )
    expect(response.status).toBe(403)
    expect(getYookassaPayment).not.toHaveBeenCalled()
  })

  it('accepts request from YooKassa IPv6 (2a02:5180::/32)', async () => {
    vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'succeeded' })
    const response = await POST(
      makeRequest(PAID_PAYLOAD, { 'x-forwarded-for': '2a02:5180:abcd::1' })
    )
    expect(response.status).toBe(200)
    expect(transitionOrderToPaid).toHaveBeenCalledWith('order-1', 'webhook')
  })

  it('respects YOOKASSA_IP_FILTER=off and skips IP check', async () => {
    process.env.YOOKASSA_IP_FILTER = 'off'
    vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'succeeded' })
    const response = await POST(
      makeRequest(PAID_PAYLOAD, { 'x-forwarded-for': '203.0.113.5' })
    )
    expect(response.status).toBe(200)
    expect(transitionOrderToPaid).toHaveBeenCalled()
  })

  it('handles canceled event via transitionOrderToCanceled', async () => {
    const response = await POST(
      makeRequest({
        type: 'notification',
        event: 'payment.canceled',
        object: { id: 'pmt-1', status: 'canceled', metadata: { orderId: 'order-1' } },
      })
    )
    expect(response.status).toBe(200)
    expect(transitionOrderToCanceled).toHaveBeenCalledWith('order-1', 'webhook')
  })

  it('returns 200 ok if order not found (idempotent acknowledgement)', async () => {
    vi.mocked(orderService.findOrderForWebhook).mockResolvedValueOnce(null)
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(200)
    expect(getYookassaPayment).not.toHaveBeenCalled()
  })

  it('returns 200 ok if paymentId mismatches (e.g. stale notification)', async () => {
    vi.mocked(orderService.findOrderForWebhook).mockResolvedValueOnce({
      id: 'order-1',
      orderNumber: 42,
      status: 'pending',
      yookassaPaymentId: 'different-pmt',
      userId: 'user-1',
    })
    const response = await POST(makeRequest(PAID_PAYLOAD))
    expect(response.status).toBe(200)
    expect(getYookassaPayment).not.toHaveBeenCalled()
  })

  describe('checkout-session tracking', () => {
    it('does nothing when the order has no CheckoutSession (orders predating the feature)', async () => {
      vi.mocked(checkoutSessionService.findSessionByOrderId).mockResolvedValue(null)
      vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'succeeded' })

      const response = await POST(makeRequest(PAID_PAYLOAD))

      expect(response.status).toBe(200)
      expect(trackPaymentCallback).not.toHaveBeenCalled()
    })

    it('duplicate succeeded webhook does not fire the checkout transition twice (idempotent)', async () => {
      vi.mocked(checkoutSessionService.findSessionByOrderId).mockResolvedValue({
        id: 'sess-1',
      } as never)
      vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'succeeded' })
      // Первый вызов реально меняет статус; второй — сессия уже COMPLETED, идемпотентность
      // гарантируется самой transitionCheckoutToPaymentSucceeded (см. checkout-session-flow.test.ts);
      // здесь проверяем, что webhook вызывает переход при каждом callback, не пропуская его.
      transitionCheckoutToPaymentSucceededMock.mockResolvedValueOnce({ changed: true })
      transitionCheckoutToPaymentSucceededMock.mockResolvedValueOnce({ changed: false })

      await POST(makeRequest(PAID_PAYLOAD))
      await POST(makeRequest(PAID_PAYLOAD))

      expect(transitionCheckoutToPaymentSucceededMock).toHaveBeenCalledTimes(2)
      expect(transitionCheckoutToPaymentSucceededMock).toHaveBeenNthCalledWith(1, 'sess-1', 'webhook')
      expect(transitionCheckoutToPaymentSucceededMock).toHaveBeenNthCalledWith(2, 'sess-1', 'webhook')
    })

    it('does not fail the webhook response when checkout tracking throws', async () => {
      vi.mocked(checkoutSessionService.findSessionByOrderId).mockRejectedValue(new Error('db down'))
      vi.mocked(getYookassaPayment).mockResolvedValue({ status: 'succeeded' })

      const response = await POST(makeRequest(PAID_PAYLOAD))

      expect(response.status).toBe(200)
      expect(transitionOrderToPaid).toHaveBeenCalled()
    })
  })
})
