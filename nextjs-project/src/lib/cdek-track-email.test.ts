import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/email', () => ({
  sendAdminCdekTrackNotification: vi.fn(),
  sendCustomerCdekTrackNotification: vi.fn(),
}))

vi.mock('@/services/order.service', () => ({
  findOrderForPaidEmail: vi.fn(),
  findCdekTrackEmailState: vi.fn(),
  findOrderBrandIdForNotify: vi.fn(),
  claimCdekTrackEmailChannel: vi.fn(),
  finishCdekTrackEmailChannel: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
  getAdminNotificationEmails: vi.fn(),
}))

vi.mock('@/lib/order-shipping-cost', () => ({
  resolveShippingCostForOrderNotify: vi.fn().mockReturnValue(300),
}))

import {
  sendAdminCdekTrackNotification,
  sendCustomerCdekTrackNotification,
} from '@/lib/email'
import { sendCdekTrackEmailsForOrder } from '@/lib/cdek-track-email'
import * as orderService from '@/services/order.service'
import * as userService from '@/services/user.service'

const order = {
  id: 'order-1',
  orderNumber: 221,
  total: 1300,
  items: [{ quantity: 1, price: 1000, product: { title: 'Товар' } }],
  promoCode: null,
  shippingInfo: {
    fullName: 'Иван',
    phone: '+79990000000',
    email: 'customer@example.com',
    address: 'ул. Пушкина, 1',
    city: 'Москва',
    zipCode: '101000',
    country: 'Россия',
  },
}

describe('sendCdekTrackEmailsForOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(orderService.findOrderForPaidEmail).mockResolvedValue(order as never)
    vi.mocked(orderService.findCdekTrackEmailState).mockResolvedValue({
      cdekTrackAdminEmailSentAt: null,
      cdekTrackCustomerEmailSentAt: null,
    })
    vi.mocked(orderService.findOrderBrandIdForNotify).mockResolvedValue('inner')
    vi.mocked(orderService.claimCdekTrackEmailChannel).mockResolvedValue(true)
    vi.mocked(orderService.finishCdekTrackEmailChannel).mockResolvedValue()
    vi.mocked(userService.getAdminNotificationEmails).mockResolvedValue(['admin@example.com'])
    vi.mocked(sendAdminCdekTrackNotification).mockResolvedValue({ ok: true })
    vi.mocked(sendCustomerCdekTrackNotification).mockResolvedValue({ ok: true })
  })

  it('claims and records both channels after successful SMTP sends', async () => {
    const result = await sendCdekTrackEmailsForOrder('order-1', ' 10312641279 ')

    expect(result).toEqual({ adminSent: true, customerSent: true, errors: [] })
    expect(orderService.claimCdekTrackEmailChannel).toHaveBeenNthCalledWith(1, 'order-1', 'admin')
    expect(orderService.claimCdekTrackEmailChannel).toHaveBeenNthCalledWith(2, 'order-1', 'customer')
    expect(orderService.finishCdekTrackEmailChannel).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'admin', ok: true })
    )
    expect(orderService.finishCdekTrackEmailChannel).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'customer', ok: true })
    )
  })

  it('does not resend channels already marked as sent', async () => {
    vi.mocked(orderService.findCdekTrackEmailState).mockResolvedValue({
      cdekTrackAdminEmailSentAt: new Date(),
      cdekTrackCustomerEmailSentAt: new Date(),
    })

    const result = await sendCdekTrackEmailsForOrder('order-1', '10312641279')

    expect(result).toEqual({ adminSent: true, customerSent: true, errors: [] })
    expect(orderService.claimCdekTrackEmailChannel).not.toHaveBeenCalled()
    expect(sendAdminCdekTrackNotification).not.toHaveBeenCalled()
    expect(sendCustomerCdekTrackNotification).not.toHaveBeenCalled()
  })

  it('releases a failed channel for a later cron retry', async () => {
    vi.mocked(sendCustomerCdekTrackNotification).mockResolvedValue({
      ok: false,
      error: 'temporary SMTP failure',
    })

    const result = await sendCdekTrackEmailsForOrder('order-1', '10312641279')

    expect(result.customerSent).toBe(false)
    expect(result.errors).toEqual(['customer: temporary SMTP failure'])
    expect(orderService.finishCdekTrackEmailChannel).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'customer', ok: false, error: 'temporary SMTP failure' })
    )
  })
})
