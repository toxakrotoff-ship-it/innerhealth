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

const deliveryOrder = {
  orderId: 'order-352', orderNumber: 352, total: 3340, shippingCost: 140,
  items: [{ title: 'Товар', quantity: 1, price: 3200 }],
  shipping: { fullName: 'Тест', phone: '+79001234567', email: 'test@example.com', address: '<ПВЗ> & адрес', city: 'Москва', zipCode: '', country: 'Россия' },
  brandId: 'inner' as const,
}

describe('Telegram carrier identification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 1 } }) })
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue('token')
    vi.mocked(userService.getAdminTelegramChatIds).mockResolvedValue(['admin-1'])
  })

  it.each(['full', 'compact'] as const)('marks Ozon prominently and includes its numbers in %s admin messages', async mode => {
    const notify = await import('@/lib/telegram-notify')
    const payload = { ...deliveryOrder, deliveryMethod: 'ozon_pvz',
      ozonShipment: { orderNumber: 'AB-352', postingNumber: 'PP-352', status: 'ready_for_shipping', error: null },
      cdekOrderUuid: 'stale-cdek',
    }
    if (mode === 'full') notify.notifyTelegramOrder(payload)
    else await notify.notifyTelegramPaidOrderForAdmins(payload)
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce())
    const body = JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body))
    expect(body.text.split('\n')[0]).toBe('<b>OZON Доставка · заказ #352</b>')
    expect(body.text).toContain('Заказ оплачен')
    expect(body.text).toContain('Заказ OZON: AB-352')
    expect(body.text).toContain('Отправление OZON: PP-352')
    expect(body.text).toContain('Статус: Готово к отгрузке')
    expect(body.text).toContain('ПВЗ: &lt;ПВЗ&gt; &amp; адрес')
    expect(body.text).not.toContain('stale-cdek')
    expect(JSON.stringify(body.reply_markup)).not.toContain('cdek_create_')
    expect(body.text).toContain('/admin/orders?search=%23352')
  })

  it('identifies Ozon even before asynchronous shipment creation completes', async () => {
    const notify = await import('@/lib/telegram-notify')
    notify.notifyTelegramOrder({ ...deliveryOrder, deliveryMethod: 'ozon_pvz', ozonShipment: null })
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce())
    const body = JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body))
    expect(body.text).toContain('<b>OZON Доставка · заказ #352</b>')
    expect(body.text).toContain('Отправление ещё не создано')
    expect(body.text).not.toContain('Готово к отгрузке')
  })

  it('shows both CDEK identifiers and does not offer duplicate creation when tracking exists', async () => {
    const notify = await import('@/lib/telegram-notify')
    notify.notifyTelegramOrder({ ...deliveryOrder, deliveryMethod: 'cdek_door', cdekTrackNumber: '1234567890', cdekOrderUuid: 'uuid-cdek' })
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce())
    const body = JSON.parse(String(vi.mocked(global.fetch).mock.calls[0][1]?.body))
    expect(body.text.split('\n')[0]).toBe('<b>СДЭК · заказ #352</b>')
    expect(body.text).toContain('Способ: до двери')
    expect(body.text).toContain('Трек СДЭК: 1234567890')
    expect(body.text).toContain('UUID СДЭК: uuid-cdek')
    expect(JSON.stringify(body.reply_markup)).not.toContain('cdek_create_')
  })
})
