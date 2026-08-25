import { describe, expect, it } from 'vitest'
import { describeProviderError, getCheckoutReason, getCheckoutReasonCompact } from '@/lib/checkout-session-reason'
import type { CheckoutStep } from '@prisma/client'

describe('getCheckoutReason', () => {
  it('returns the provider error description for PAYMENT_FAILED with a matching error event', () => {
    const reason = getCheckoutReason({
      status: 'PAYMENT_FAILED',
      currentStep: 'PAYMENT_PROCESSING',
      events: [
        {
          eventType: 'PAYMENT_FAILED',
          metadata: { code: 'INSUFFICIENT_FUNDS', message: 'x' },
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })
    expect(reason).toBe('Ошибка оплаты: Недостаточно средств на карте')
  })

  it('returns "Оплата отменена" for PAYMENT_CANCELLED regardless of step', () => {
    const reason = getCheckoutReason({ status: 'PAYMENT_CANCELLED', currentStep: 'PAYMENT_REDIRECT', events: [] })
    expect(reason).toBe('Оплата отменена')
  })

  it('returns "Оформление завершено" for COMPLETED', () => {
    const reason = getCheckoutReason({ status: 'COMPLETED', currentStep: 'COMPLETED', events: [] })
    expect(reason).toBe('Оформление завершено')
  })

  it('picks the most recent error event when several are present', () => {
    const reason = getCheckoutReason({
      status: 'PAYMENT_FAILED',
      currentStep: 'PAYMENT_PROCESSING',
      events: [
        { eventType: 'PAYMENT_FAILED', metadata: { code: 'OLD' }, createdAt: '2026-01-01T00:00:00Z' },
        { eventType: 'PAYMENT_FAILED', metadata: { code: 'CALL_ISSUER' }, createdAt: '2026-01-02T00:00:00Z' },
      ],
    })
    expect(reason).toBe('Ошибка оплаты: Банк отклонил платёж, обратитесь в банк')
  })

  const stepCases: Array<[CheckoutStep, string]> = [
    ['CART', 'Не указал контактные данные'],
    ['CONTACT', 'Указал контакты, но не выбрал доставку'],
    ['DELIVERY', 'Выбрал доставку, но не подтвердил заказ'],
    ['CONFIRMATION', 'Подтвердил, но заказ не создан'],
    ['ORDER_CREATED', 'Заказ создан, но не перешёл к оплате'],
    ['PAYMENT_INITIALIZATION', 'Перешёл к оплате, но не завершил её'],
    ['PAYMENT_CREATED', 'Перешёл к оплате, но не завершил её'],
    ['PAYMENT_REDIRECT', 'Перешёл к оплате, но не завершил её'],
    ['PAYMENT_PROCESSING', 'Перешёл к оплате, но не завершил её'],
  ]

  it.each(stepCases)('for ACTIVE at step %s, returns "%s"', (step, expected) => {
    const reason = getCheckoutReason({ status: 'ACTIVE', currentStep: step, events: [] })
    expect(reason).toBe(expected)
  })

  it('falls back to a generic message for an unhandled step (e.g. COMPLETED without COMPLETED status)', () => {
    const reason = getCheckoutReason({ status: 'ABANDONED', currentStep: 'COMPLETED', events: [] })
    expect(reason).toBe('Не продолжил оформление')
  })
})

describe('describeProviderError', () => {
  it('maps a known code to a short Russian label', () => {
    expect(describeProviderError({ code: 'INSUFFICIENT_FUNDS' })).toBe('Недостаточно средств на карте')
  })

  it('falls back to the raw message for an unknown code', () => {
    expect(describeProviderError({ code: 'SOME_UNKNOWN_CODE', message: 'raw provider text' })).toBe(
      'raw provider text'
    )
  })

  it('falls back to a generic message when metadata is empty', () => {
    expect(describeProviderError(null)).toBe('Оплата не прошла')
  })
})

describe('getCheckoutReasonCompact', () => {
  it('does not require events and stays consistent with the step-based branch of getCheckoutReason', () => {
    expect(getCheckoutReasonCompact('ACTIVE', 'CONTACT')).toBe(
      'Указал контакты, но не выбрал доставку'
    )
  })
})
