import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { buildPaymentCallbackMetadata, buildPaymentProviderErrorMetadata } = await import(
  '@/lib/checkout-event-metadata'
)

describe('buildPaymentCallbackMetadata', () => {
  it('never includes payment_method (may contain a masked card number/token)', () => {
    const raw = {
      status: 'succeeded',
      raw: {
        id: 'pmt-1',
        status: 'succeeded',
        payment_method: {
          type: 'bank_card',
          card: { first6: '411111', last4: '1111', card_type: 'Visa' },
        },
        confirmation: { type: 'redirect', confirmation_url: 'https://...' },
        receipt: { customer: { email: 'user@example.com' } },
      },
    }

    const metadata = buildPaymentCallbackMetadata(raw)

    expect(metadata).toEqual({ status: 'succeeded' })
    expect(JSON.stringify(metadata)).not.toMatch(/card|411111|confirmation|receipt|email/i)
  })
})

describe('buildPaymentProviderErrorMetadata', () => {
  it('only whitelists code/message/providerStatus', () => {
    const metadata = buildPaymentProviderErrorMetadata({
      code: 'INSUFFICIENT_FUNDS',
      message: 'Недостаточно средств на карте',
      httpStatus: 200,
      providerStatus: 'bank',
    })

    expect(metadata).toEqual({
      code: 'INSUFFICIENT_FUNDS',
      message: 'Недостаточно средств на карте',
      providerStatus: 'bank',
    })
  })
})

describe('privacy insurance: no CheckoutEvent.metadata builder ever leaks a sensitive field', () => {
  const FORBIDDEN_PATTERN = /card|cvv|token|secret|password|authoriz/i

  it('grep-style check across representative payloads built by these functions', () => {
    const samples = [
      buildPaymentCallbackMetadata({
        status: 'canceled',
        raw: { payment_method: { card: { last4: '1234' } }, metadata: { authorization: 'x', token: 'y' } },
      }),
      buildPaymentProviderErrorMetadata({ code: 'CALL_ISSUER', message: 'Банк отклонил платёж' }),
    ]

    for (const sample of samples) {
      expect(JSON.stringify(sample)).not.toMatch(FORBIDDEN_PATTERN)
    }
  })
})
