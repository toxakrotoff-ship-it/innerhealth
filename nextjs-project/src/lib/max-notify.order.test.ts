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
  findMaxWhitelistEntriesByUserId: vi.fn(),
}))

vi.mock('@/services/review-moderation-message.service', () => ({
  upsertReviewModerationMessage: vi.fn().mockResolvedValue(undefined),
}))

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
const reviewModerationMessageService = await import('@/services/review-moderation-message.service')

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
      expect.stringContaining('**Заказ оплачен**'),
      expect.any(Object)
    )
    expect(sendMessageToUser).toHaveBeenNthCalledWith(
      2,
      102,
      expect.stringContaining('**Заказ оплачен**'),
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
      expect.stringContaining('**Заказ оплачен**'),
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

  it('mirrors Sprint Power order notices to Inner Health with source site headers', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(userService.getAdminMaxUserIds).mockImplementation(async (brandId) =>
      brandId === 'inner' ? ['101'] : ['102']
    )
    vi.mocked(maxService.getPartnerMaxUserIdByPromoCodeId).mockImplementation(async (_, scope) =>
      scope.brandId === 'inner' ? '201' : '202'
    )
    vi.mocked(maxService.findMaxWhitelistByUserId).mockImplementation(async (_, scope) =>
      ({ maxUserId: scope.brandId === 'inner' ? '301' : '302' }) as never
    )

    const { notifyMaxOrder } = await import('@/lib/max-notify')
    await notifyMaxOrder({
      orderId: 'sprint-order',
      total: 1200,
      shippingCost: 200,
      items: [{ title: 'Sprint', quantity: 1, price: 1000 }],
      shipping: {
        fullName: 'Ivan Ivanov',
        phone: '+79990000000',
        email: 'ivan@example.com',
        address: 'Lenina 1',
        city: 'Moscow',
        zipCode: '101000',
        country: 'Russia',
      },
      promoCodeId: 'promo-1',
      customerUserId: 'user-1',
      brandId: 'sprint-power',
    })

    expect(sendMessageToUser).toHaveBeenCalledTimes(6)
    expect(sendMessageToUser.mock.calls.map((call) => call[0])).toEqual([102, 101, 202, 201, 302, 301])
    for (const [, text] of sendMessageToUser.mock.calls) {
      expect(text).toMatch(/^\*\*Сайт: Sprint Power \(sprintpower\.ru\)\*\*/)
    }
    expect(String(sendMessageToUser.mock.calls[1]?.[1])).toContain('**Доставка:**')
    expect(String(sendMessageToUser.mock.calls[3]?.[1])).not.toContain('**Доставка:**')
    expect(String(sendMessageToUser.mock.calls[5]?.[1])).not.toContain('**Доставка:**')
    expect(settingsService.getMaxBotSettings).toHaveBeenCalledWith({ brandId: 'sprint-power' })
    expect(settingsService.getMaxBotSettings).toHaveBeenCalledWith({ brandId: 'inner' })
  })

  it('mirrors Sprint Power forms and user order status with Sprint Power links', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(userService.getAdminMaxUserIds).mockImplementation(async (brandId) =>
      brandId === 'inner' ? ['101'] : ['102']
    )
    vi.mocked(maxService.findMaxWhitelistByUserId).mockImplementation(async (_, scope) =>
      ({ maxUserId: scope.brandId === 'inner' ? '301' : '302' }) as never
    )
    const { notifyMaxForm, notifyMaxOrderStatusForUser } = await import('@/lib/max-notify')

    await notifyMaxForm({ formName: 'B2B', fields: { Имя: 'Иван' }, brandId: 'sprint-power' })
    await notifyMaxOrderStatusForUser({
      userId: 'user-1',
      orderId: 'order-777',
      status: 'canceled',
      brandId: 'sprint-power',
    })

    expect(sendMessageToUser.mock.calls.map((call) => call[0])).toEqual([102, 101, 302, 301])
    expect(String(sendMessageToUser.mock.calls[1]?.[1])).toContain('**Сайт: Sprint Power (sprintpower.ru)**')
    expect(String(sendMessageToUser.mock.calls[3]?.[1])).toContain('https://sprintpower.ru/account/orders/order-777')
    expect(String(sendMessageToUser.mock.calls[3]?.[1])).toContain('❌ **Платёж отменён**')
  })

  it('saves separate moderation message references for both MAX bots', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(userService.getAdminMaxUserIds).mockResolvedValue(['101'])
    const { notifyMaxNewReview } = await import('@/lib/max-notify')

    await notifyMaxNewReview({
      reviewId: 'review-1',
      authorName: 'Иван',
      text: 'Отличный продукт',
      brandId: 'sprint-power',
    })

    expect(sendMessageToUser).toHaveBeenCalledTimes(2)
    expect(reviewModerationMessageService.upsertReviewModerationMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: 'review-1', channel: 'MAX', recipientId: '101' })
    )
    expect(reviewModerationMessageService.upsertReviewModerationMessage).toHaveBeenCalledWith(
      expect.objectContaining({ reviewId: 'review-1', channel: 'MAX_INNER', recipientId: '101' })
    )
  })

  it('delivers Sprint Power status to an Inner Health user even without a Sprint Power link', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(userService.getAdminMaxUserIds).mockResolvedValue([])
    vi.mocked(maxService.findMaxWhitelistByUserId).mockImplementation(async (_, scope) =>
      scope.brandId === 'inner' ? ({ maxUserId: '301' } as never) : null
    )
    const { notifyMaxOrderStatusForUser } = await import('@/lib/max-notify')

    await notifyMaxOrderStatusForUser({
      userId: 'user-1',
      orderId: 'sprint-order',
      status: 'paid',
      brandId: 'sprint-power',
    })

    expect(sendMessageToUser).toHaveBeenCalledTimes(1)
    expect(sendMessageToUser).toHaveBeenCalledWith(
      301,
      expect.stringContaining('**Сайт: Sprint Power (sprintpower.ru)**'),
      expect.any(Object)
    )
  })

  it('sends a Sprint Power password reset link through both linked bots', async () => {
    vi.mocked(settingsService.getMaxBotSettings).mockResolvedValue({ token: 'token' } as never)
    vi.mocked(maxService.findMaxWhitelistEntriesByUserId).mockResolvedValue([
      { brand: 'sprint-power', maxUserId: '301' },
      { brand: 'inner', maxUserId: '301' },
    ] as never)
    const { notifyMaxPasswordResetForUser } = await import('@/lib/max-notify')

    const delivered = await notifyMaxPasswordResetForUser({
      userId: 'user-1',
      resetLink: 'https://sprintpower.ru/login/reset-password?token=secret',
      expiresInMinutes: 30,
    })

    expect(delivered).toBe(true)
    expect(sendMessageToUser).toHaveBeenCalledTimes(2)
    for (const [, text] of sendMessageToUser.mock.calls) {
      expect(text).toMatch(/^\*\*Сайт: Sprint Power \(sprintpower\.ru\)\*\*/)
    }
  })
})
