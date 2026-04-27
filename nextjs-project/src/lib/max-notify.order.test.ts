import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendMessageToUser = vi.fn()

vi.mock('@/services/settings.service', () => ({
  getMaxBotSettings: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
  getAdminMaxUserIds: vi.fn(),
  findUserProfile: vi.fn(),
}))

vi.mock('@/services/max.service', () => ({
  getMaxWhitelist: vi.fn(),
  getPartnerMaxUserIdByPromoCodeId: vi.fn(),
  findMaxWhitelistByUserId: vi.fn(),
}))

vi.mock('@/services/review-moderation-message.service', () => ({}))

vi.mock('@maxhub/max-bot-api', () => ({
  Bot: class MockBot {
    api = {
      sendMessageToUser,
    }
  },
  Keyboard: {
    inlineKeyboard: vi.fn(),
    button: {
      callback: vi.fn(),
      link: vi.fn(),
    },
  },
}))

const settingsService = await import('@/services/settings.service')
const userService = await import('@/services/user.service')
const maxService = await import('@/services/max.service')

describe('notifyMaxOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sendMessageToUser.mockResolvedValue({ message: { body: { mid: '1' } } })
  })

  it('sends full order details only to admins and a short message to the partner', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(userService.getAdminMaxUserIds).mockResolvedValue(['101', '102'])
    vi.mocked(maxService.getPartnerMaxUserIdByPromoCodeId).mockResolvedValue('201')
    vi.mocked(maxService.findMaxWhitelistByUserId).mockResolvedValue({ maxUserId: '301' } as never)

    const maxNotify = await import('@/lib/max-notify')

    await maxNotify.notifyMaxOrder({
      orderId: 'order-123',
      total: 2500,
      shippingCost: 300,
      items: [{ title: 'Omega-3', quantity: 2, price: 1250 }],
      shipping: {
        fullName: 'Ivan Ivanov',
        phone: '+79990000000',
        email: 'ivan@example.com',
        address: 'Lenina 1',
        city: 'Moscow',
        zipCode: '101000',
        country: 'Russia',
      },
      promoCode: 'PROMO10',
      promoCodeId: 'promo-1',
      customerUserId: 'user-1',
      brandId: 'inner',
    })

    expect(userService.getAdminMaxUserIds).toHaveBeenCalledWith('inner')
    expect(maxService.getMaxWhitelist).not.toHaveBeenCalled()
    expect(sendMessageToUser).toHaveBeenCalledTimes(4)

    expect(sendMessageToUser).toHaveBeenNthCalledWith(
      1,
      101,
      expect.stringContaining('**Новый заказ**'),
      expect.any(Object)
    )
    expect(sendMessageToUser).toHaveBeenNthCalledWith(
      2,
      102,
      expect.stringContaining('**Новый заказ**'),
      expect.any(Object)
    )
    expect(sendMessageToUser).toHaveBeenNthCalledWith(
      3,
      201,
      expect.stringContaining('**Заказ по вашему промокоду**'),
      expect.any(Object)
    )
    expect(sendMessageToUser).toHaveBeenNthCalledWith(
      4,
      301,
      expect.stringContaining('**Ваш заказ принят**'),
      expect.any(Object)
    )

    const partnerText = sendMessageToUser.mock.calls[2]?.[1]
    expect(String(partnerText)).not.toContain('**Доставка:**')
    const customerText = sendMessageToUser.mock.calls[3]?.[1]
    expect(String(customerText)).not.toContain('**Доставка:**')

    const adminText = sendMessageToUser.mock.calls[0]?.[1]
    expect(String(adminText)).toContain('Доставка — 300 ₽')
  })

  it('sends order status only to the linked user id', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(maxService.findMaxWhitelistByUserId).mockResolvedValue({ maxUserId: '401' } as never)

    const maxNotify = await import('@/lib/max-notify')

    await maxNotify.notifyMaxOrderStatusForUser({
      userId: 'user-1',
      orderId: 'order-777',
      status: 'paid',
      brandId: 'inner',
    })

    expect(maxService.findMaxWhitelistByUserId).toHaveBeenCalledWith('user-1', { brandId: 'inner' })
    expect(userService.getAdminMaxUserIds).toHaveBeenCalledWith('inner')
    expect(sendMessageToUser).toHaveBeenCalledTimes(1)
    expect(sendMessageToUser).toHaveBeenCalledWith(
      401,
      expect.stringContaining('**Заказ оплачен**'),
      expect.any(Object)
    )
  })

  it('sends payment errors only to admin MAX users', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(userService.getAdminMaxUserIds).mockResolvedValue(['101'])

    const maxNotify = await import('@/lib/max-notify')

    await maxNotify.notifyMaxPaymentError({
      orderId: 'order-err',
      total: 1234,
      errorMessage: 'gateway timeout',
      context: 'webhook',
      brandId: 'inner',
    })

    expect(userService.getAdminMaxUserIds).toHaveBeenCalledWith('inner')
    expect(sendMessageToUser).toHaveBeenCalledTimes(1)
    expect(sendMessageToUser).toHaveBeenCalledWith(
      101,
      expect.stringContaining('**Ошибка ЮKassa**'),
      expect.any(Object)
    )
  })
})
