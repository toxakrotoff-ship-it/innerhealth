import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/services/settings.service', () => ({
  getTelegramBotToken: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
  getAdminTelegramChatIds: vi.fn(),
  findUserProfile: vi.fn(),
}))

vi.mock('@/services/telegram.service', () => ({
  findTelegramWhitelistByUserId: vi.fn(),
  getPartnerTelegramUserIdByPromoCodeId: vi.fn(),
}))

vi.mock('@/services/review-moderation-message.service', () => ({}))

const settingsService = await import('@/services/settings.service')
const userService = await import('@/services/user.service')
const telegramService = await import('@/services/telegram.service')

describe('notifyTelegramOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error test env
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { message_id: 1 } }),
      text: () => Promise.resolve(''),
    })
  })

  it('sends full order details only to admins and a short message to the partner', async () => {
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue('token')
    vi.mocked(userService.getAdminTelegramChatIds).mockResolvedValue(['admin-1', 'admin-2'])
    vi.mocked(telegramService.getPartnerTelegramUserIdByPromoCodeId).mockResolvedValue('partner-1')

    const telegramNotify = await import('@/lib/telegram-notify')

    telegramNotify.notifyTelegramOrder({
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
      brandId: 'inner',
    })

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    expect(userService.getAdminTelegramChatIds).toHaveBeenCalledWith('inner')

    const calls = vi.mocked(global.fetch).mock.calls
    const adminBodies = calls.slice(0, 2).map(([, options]) => JSON.parse(String(options?.body)))
    const partnerBody = JSON.parse(String(calls[2]?.[1]?.body))

    expect(adminBodies).toEqual([
      expect.objectContaining({ chat_id: 'admin-1', text: expect.stringContaining('<b>Заказ оплачен</b>') }),
      expect.objectContaining({ chat_id: 'admin-2', text: expect.stringContaining('<b>Заказ оплачен</b>') }),
    ])
    expect(partnerBody).toEqual(
      expect.objectContaining({
        chat_id: 'partner-1',
        text: expect.stringContaining('<b>Заказ по вашему промокоду</b>'),
      })
    )
    expect(partnerBody.text).not.toContain('<b>Доставка:</b>')
    expect(adminBodies[0]?.text).toContain('Доставка — 300 ₽')
  })

  it('sends order status only to the linked chat of the requested user', async () => {
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue('token')
    vi.mocked(telegramService.findTelegramWhitelistByUserId).mockResolvedValue({
      telegramUserId: 'user-chat-1',
    } as never)

    const telegramNotify = await import('@/lib/telegram-notify')

    await telegramNotify.notifyTelegramOrderStatusForUser({
      userId: 'user-1',
      orderId: 'order-777',
      status: 'paid',
      brandId: 'inner',
    })

    expect(telegramService.findTelegramWhitelistByUserId).toHaveBeenCalledWith('user-1', { brandId: 'inner' })
    expect(userService.getAdminTelegramChatIds).toHaveBeenCalledWith('inner')
    expect(global.fetch).toHaveBeenCalledTimes(1)

    const body = JSON.parse(String(vi.mocked(global.fetch).mock.calls[0]?.[1]?.body))
    expect(body).toEqual(
      expect.objectContaining({
        chat_id: 'user-chat-1',
        text: expect.stringContaining('Заказ оплачен'),
      })
    )
  })

  it('sends admin payment errors only to admin chats', async () => {
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue('token')
    vi.mocked(userService.getAdminTelegramChatIds).mockResolvedValue(['admin-1'])

    const telegramNotify = await import('@/lib/telegram-notify')

    telegramNotify.notifyTelegramPaymentError({
      orderId: 'order-err',
      total: 1234,
      errorMessage: 'gateway timeout',
      context: 'webhook',
      brandId: 'inner',
    })

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    expect(userService.getAdminTelegramChatIds).toHaveBeenCalledWith('inner')
    const body = JSON.parse(String(vi.mocked(global.fetch).mock.calls[0]?.[1]?.body))
    expect(body).toEqual(
      expect.objectContaining({
        chat_id: 'admin-1',
        text: expect.stringContaining('Ошибка ЮKassa'),
      })
    )
  })
})
