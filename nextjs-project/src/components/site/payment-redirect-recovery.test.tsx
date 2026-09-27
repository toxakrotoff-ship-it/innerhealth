/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { PaymentRedirectRecovery } from './payment-redirect-recovery'
import {
  PAYMENT_REDIRECT_STORAGE_KEY,
  clearPendingPaymentRedirect,
  readPendingPaymentRedirect,
  savePendingPaymentRedirect,
} from '@/lib/payment-redirect-recovery'

describe('payment redirect recovery', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('shows a link to the existing payment after redirecting away and back', () => {
    const view = render(<PaymentRedirectRecovery brandId="inner" />)
    expect(view.container.querySelector('a')).toBeNull()

    act(() => savePendingPaymentRedirect('order-1', 'inner', 'https://payment.example/checkout'))
    expect(view.container.querySelector('a')?.getAttribute('href'))
      .toBe('https://payment.example/checkout')

    view.unmount()
    const restored = render(<PaymentRedirectRecovery brandId="inner" />)
    expect(restored.container.querySelector('a')).toBeTruthy()
    restored.rerender(<PaymentRedirectRecovery brandId="sprint-power" />)
    expect(restored.container.querySelector('a')).toBeNull()
  })

  it('does not show stale or unsafe links and clears only the paid order', () => {
    const now = Date.now()
    window.sessionStorage.setItem(PAYMENT_REDIRECT_STORAGE_KEY, JSON.stringify({
      orderId: 'old', brandId: 'inner', url: 'https://payment.example/checkout', createdAt: now - 51 * 60 * 1000,
    }))
    expect(readPendingPaymentRedirect(now)).toBeNull()

    savePendingPaymentRedirect('order-1', 'inner', 'javascript:alert(1)')
    expect(readPendingPaymentRedirect()).toBeNull()

    savePendingPaymentRedirect('order-1', 'inner', 'https://payment.example/checkout')
    clearPendingPaymentRedirect('another-order')
    expect(readPendingPaymentRedirect()?.orderId).toBe('order-1')
    clearPendingPaymentRedirect('order-1')
    expect(readPendingPaymentRedirect()).toBeNull()
  })
})
