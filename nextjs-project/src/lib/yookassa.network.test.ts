import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkYookassaConnection, createYookassaPayment, getYookassaPayment } from './yookassa'

const credentials = { shopId: '12345', secretKey: 'live_test_fixture' }
const params = {
  amount: 1325,
  description: 'Test order',
  orderId: 'test-order',
  customerEmail: 'test@example.com',
  receiptItems: [],
  returnUrl: 'https://example.com/cart?payment=success',
  idempotenceKey: 'same-operation-key',
  credentials,
}
const payment = {
  id: 'test-payment',
  status: 'pending',
  confirmation: { confirmation_url: 'https://example.com/confirm' },
}

function dnsError(): Error {
  return new TypeError('fetch failed', { cause: Object.assign(new Error('DNS unavailable'), { code: 'EAI_AGAIN' }) })
}

describe('YooKassa temporary DNS failures', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('recovers after two DNS failures using the same payment body and idempotence key', async () => {
    fetchMock.mockRejectedValueOnce(dnsError()).mockRejectedValueOnce(dnsError())
      .mockResolvedValueOnce(Response.json(payment))
    const result = createYookassaPayment(params)
    await vi.advanceTimersByTimeAsync(300)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(600)
    await expect(result).resolves.toEqual({ paymentId: 'test-payment', confirmationUrl: 'https://example.com/confirm' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const originalRequest = fetchMock.mock.calls[0][1]
    for (const [url, init] of fetchMock.mock.calls) {
      expect(url).toBe('https://api.yookassa.ru/v3/payments')
      expect(init).toEqual(originalRequest)
      expect(init?.headers).toMatchObject({ 'Idempotence-Key': params.idempotenceKey })
      expect(JSON.parse(init!.body as string)).toMatchObject({ amount: { value: '1325.00' }, metadata: { orderId: params.orderId } })
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    }
  })

  it('stops after three attempts and exposes the DNS code without credentials', async () => {
    const error = dnsError()
    fetchMock.mockRejectedValue(error)
    const result = createYookassaPayment(params)
    const assertion = expect(result).rejects.toMatchObject({
      message: 'YooKassa DNS error (EAI_AGAIN) after 3 attempts',
      cause: error,
    })
    await vi.runAllTimersAsync()
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each([400, 401, 429, 500])('does not retry an API response with HTTP %s', async (status) => {
    fetchMock.mockResolvedValue(Response.json({ code: 'api_error', description: 'API rejected request' }, { status }))
    await expect(createYookassaPayment(params)).rejects.toThrow('api_error: API rejected request')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry unrelated transport failures', async () => {
    const error = new TypeError('fetch failed', { cause: { code: 'CERT_HAS_EXPIRED' } })
    fetchMock.mockRejectedValue(error)
    await expect(createYookassaPayment(params)).rejects.toBe(error)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('recovers during payment status verification', async () => {
    fetchMock.mockRejectedValueOnce(dnsError()).mockResolvedValueOnce(Response.json({ status: 'succeeded', metadata: { orderId: 'test-order' } }))
    const result = getYookassaPayment('test-payment', credentials)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toMatchObject({ status: 'succeeded', metadata: { orderId: 'test-order' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('includes the DNS cause in the admin connection check after exhaustion', async () => {
    fetchMock.mockRejectedValue(dnsError())
    const result = checkYookassaConnection(credentials)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toEqual({ ok: false, error: 'YooKassa DNS error (EAI_AGAIN) after 3 attempts' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
