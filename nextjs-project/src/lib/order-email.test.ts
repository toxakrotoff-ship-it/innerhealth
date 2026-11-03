import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendCustomerOrderPaidEmail, sendNewOrderNotification, type NewOrderEmailPayload } from './email'

const mocks = vi.hoisted(() => ({ sendMail: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: mocks.sendMail }) } }))

const payload: NewOrderEmailPayload = {
  orderId: 'order-347', orderNumber: 347, total: 1504, shippingCost: 104,
  items: [{ title: 'Товар', quantity: 1, price: 1400 }],
  shipping: { fullName: 'Покупатель', phone: '+79990000000', email: 'customer@example.com',
    address: 'Москва, ул. Примерная, 1', city: 'Москва', zipCode: '', country: 'Россия' },
  deliveryMethod: 'ozon_pvz', brandId: 'inner',
}

const send = (channel: 'admin' | 'customer', order = payload) => channel === 'admin'
  ? sendNewOrderNotification(['admin@example.com'], order)
  : sendCustomerOrderPaidEmail('customer@example.com', 'Покупатель', order)

describe('paid order delivery emails', () => {
  beforeEach(() => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    mocks.sendMail.mockReset().mockResolvedValue({ messageId: 'message-347',
      accepted: ['recipient@example.com'], rejected: [], response: '250 queued' })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it.each(['admin', 'customer'] as const)('identifies Ozon in the %s subject, blue template and text version', async channel => {
    expect(await send(channel)).toEqual({ ok: true })
    const message = mocks.sendMail.mock.calls[0][0]
    expect(message.subject).toMatch(/^OZON · .*#347.*Inner Health/)
    expect(message.html).toContain('OZON Доставка')
    expect(message.html).toContain('background-color:#005bff')
    expect(message.html).toContain('Адрес ПВЗ:')
    expect(message.text).toContain('Способ доставки: OZON — пункт выдачи')
    expect(message.text).toContain(payload.shipping.address)
    expect(message.html).toContain('1504.00 ₽')
    expect(console.log).toHaveBeenCalledWith('[email] Order email accepted by SMTP', expect.objectContaining({
      orderId: 'order-347', orderNumber: 347, deliveryMethod: 'ozon_pvz', channel,
      messageId: 'message-347', accepted: ['recipient@example.com'], rejected: [], response: '250 queued',
    }))
  })

  it.each(['admin', 'customer'] as const)('preserves the CDEK %s template and tracking number', async channel => {
    await send(channel, { ...payload, deliveryMethod: 'cdek_pvz', cdekTrackNumber: 'TRACK-123' })
    const message = mocks.sendMail.mock.calls[0][0]
    expect(message.subject).not.toContain('OZON')
    expect(message.html).not.toContain('OZON Доставка')
    expect(message.html).toContain('TRACK-123')
    expect(message.text).toContain('Трек-номер СДЭК: TRACK-123')
  })

  it('escapes the pickup point address in the Ozon banner', async () => {
    await send('admin', { ...payload, shipping: { ...payload.shipping, address: '<img src=x onerror=alert(1)>' } })
    const message = mocks.sendMail.mock.calls[0][0]
    expect(message.html).not.toContain('<img src=x')
    expect(message.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it.each(['admin', 'customer'] as const)('reports partial SMTP rejection instead of claiming %s success', async channel => {
    mocks.sendMail.mockResolvedValue({ messageId: 'partial', accepted: ['one@example.com'], rejected: ['two@example.com'] })
    expect(await send(channel)).toEqual({ ok: false, error: 'SMTP отклонил получателей: two@example.com' })
    expect(console.error).toHaveBeenCalledWith('[email] Order email recipients rejected by SMTP', expect.objectContaining({ channel, orderNumber: 347 }))
    expect(console.log).not.toHaveBeenCalledWith('[email] Order email accepted by SMTP', expect.anything())
  })

  it('logs the order number when SMTP fails', async () => {
    mocks.sendMail.mockRejectedValue(new Error('Connection timeout'))
    expect(await send('admin')).toEqual({ ok: false, error: 'Connection timeout' })
    expect(console.error).toHaveBeenCalledWith('[email] Send paid order admin notification error:', { orderId: 'order-347', orderNumber: 347, error: 'Connection timeout' })
  })
})
