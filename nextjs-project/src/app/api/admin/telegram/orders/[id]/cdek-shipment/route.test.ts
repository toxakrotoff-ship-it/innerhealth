import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

vi.mock('server-only', () => ({}))

vi.mock('@/bot/runtime/capabilities', () => ({
  getTelegramBotUserCapabilities: vi.fn(),
}))

vi.mock('@/lib/cdek-shipment-action', () => ({
  createCdekShipmentForOrder: vi.fn(),
}))

const capabilities = await import('@/bot/runtime/capabilities')
const cdekShipmentAction = await import('@/lib/cdek-shipment-action')

describe('POST /api/admin/telegram/orders/[id]/cdek-shipment', () => {
  const originalSecret = process.env.TELEGRAM_SERVICE_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TELEGRAM_SERVICE_SECRET = 'telegram-secret'
  })

  it('returns 403 without service key', async () => {
    const res = await POST(
      new Request('http://x/api/admin/telegram/orders/order-1/cdek-shipment', {
        method: 'POST',
      }),
      { params: Promise.resolve({ id: 'order-1' }) }
    )

    expect(res.status).toBe(403)
  })

  it('returns 403 for non-admin telegram user', async () => {
    vi.mocked(capabilities.getTelegramBotUserCapabilities).mockResolvedValue({
      isLinked: true,
      isAdmin: false,
      isPartner: false,
    })

    const res = await POST(
      new Request('http://x/api/admin/telegram/orders/order-1/cdek-shipment?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-service-key': 'telegram-secret' },
        body: JSON.stringify({ telegramUserId: 'tg-1' }),
      }),
      { params: Promise.resolve({ id: 'order-1' }) }
    )

    expect(res.status).toBe(403)
  })

  it('creates shipment for admin telegram user', async () => {
    vi.mocked(capabilities.getTelegramBotUserCapabilities).mockResolvedValue({
      isLinked: true,
      isAdmin: true,
      isPartner: false,
    })
    vi.mocked(cdekShipmentAction.createCdekShipmentForOrder).mockResolvedValue({
      success: true,
      uuid: 'uuid-1',
      trackNumber: 'track-1',
    })

    const res = await POST(
      new Request('http://x/api/admin/telegram/orders/order-1/cdek-shipment?brand=sprint-power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-service-key': 'telegram-secret' },
        body: JSON.stringify({ telegramUserId: 'tg-1', force: true }),
      }),
      { params: Promise.resolve({ id: 'order-1' }) }
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, uuid: 'uuid-1', trackNumber: 'track-1' })
    expect(capabilities.getTelegramBotUserCapabilities).toHaveBeenCalledWith('tg-1', {
      brandId: 'sprint-power',
    })
    expect(cdekShipmentAction.createCdekShipmentForOrder).toHaveBeenCalledWith('order-1', {
      force: true,
    })
  })

  afterAll(() => {
    process.env.TELEGRAM_SERVICE_SECRET = originalSecret
  })
})
