import { beforeEach, describe, expect, it, vi } from 'vitest'

let afterCallbackResult: unknown

vi.mock('server-only', () => ({}))

vi.mock('next/server', () => ({
  after: vi.fn((callback: () => unknown) => {
    afterCallbackResult = callback()
  }),
}))

vi.mock('@/services/order.service', () => ({
  findOrderForPaidEmail: vi.fn(),
  findOrderBrandIdForNotify: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
  getAdminNotificationEmails: vi.fn(),
}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramOrder: vi.fn(),
}))

vi.mock('@/lib/max-notify', () => ({
  notifyMaxOrder: vi.fn(),
}))

vi.mock('@/lib/email', () => ({
  sendPaidOrderEmailsWithDelay: vi.fn(),
}))

import * as orderService from '@/services/order.service'
import * as userService from '@/services/user.service'
import { notifyTelegramOrder } from '@/lib/telegram-notify'
import { notifyMaxOrder } from '@/lib/max-notify'
import { sendPaidOrderEmailsWithDelay } from '@/lib/email'
import { scheduleNotifyAllChannelsAfterOrderPaid } from '@/lib/order-paid-notifications'

describe('scheduleNotifyAllChannelsAfterOrderPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    afterCallbackResult = undefined

    vi.mocked(orderService.findOrderForPaidEmail).mockResolvedValue({
      id: 'order-1',
      orderNumber: 42,
      total: 3990,
      deliverySum: 390,
      status: 'paid',
      userId: 'user-1',
      promoCodeId: 'promo-1',
      promoDiscountAmount: 500,
      cdekTrackNumber: 'TRACK123',
      cdekOrderUuid: null,
      cdekOrderError: null,
      promoCode: { code: 'PROMO' },
      items: [
        {
          quantity: 1,
          price: 3600,
          product: { title: 'Product A' },
        },
      ],
      shippingInfo: {
        fullName: 'Ivan Ivanov',
        email: 'ivan@example.com',
        phone: '+79990000000',
        address: 'Lenina 1',
        city: 'Moscow',
        zipCode: '101000',
        country: 'Россия',
        deliveryMethod: 'cdek_pvz',
      },
    })
    vi.mocked(orderService.findOrderBrandIdForNotify).mockResolvedValue('inner')
    vi.mocked(userService.getAdminNotificationEmails).mockResolvedValue(['admin@example.com'])
    vi.mocked(notifyMaxOrder).mockResolvedValue()
    vi.mocked(sendPaidOrderEmailsWithDelay).mockResolvedValue()
  })

  it('returns a promise from after callback and awaits paid notifications', async () => {
    scheduleNotifyAllChannelsAfterOrderPaid('order-1')

    expect(afterCallbackResult).toBeInstanceOf(Promise)
    await afterCallbackResult

    expect(orderService.findOrderForPaidEmail).toHaveBeenCalledWith('order-1')
    expect(notifyTelegramOrder).toHaveBeenCalledTimes(1)
    expect(notifyMaxOrder).toHaveBeenCalledTimes(1)
    expect(sendPaidOrderEmailsWithDelay).toHaveBeenCalledWith(
      ['admin@example.com'],
      'ivan@example.com',
      'Ivan Ivanov',
      expect.objectContaining({
        orderId: 'order-1',
        orderNumber: 42,
        cdekTrackNumber: 'TRACK123',
      })
    )
  })
})
