import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/order.service', () => ({
  findOrderBrandIdForNotify: vi.fn(),
  findOrderWithItemsAndShippingForCdek: vi.fn(),
}))

vi.mock('@/services/settings.service', () => ({
  getCdekCredentials: vi.fn(),
  getSettingsMap: vi.fn(),
}))

type JsonResponseInit = {
  ok?: boolean
  status?: number
}

function jsonResponse(data: unknown, init: JsonResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? (init.ok === false ? 500 : 200),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createCdekOrder', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('always sends shipment_point from settings and uses SKU/title for ware_key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 3600,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            code: 'MSK123',
            city_code: 44,
            city: 'Москва',
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entity: {
            uuid: 'cdek-uuid',
            track_number: 'TRACK-1',
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entity: {
            track_number: 'TRACK-1',
          },
          requests: [],
        })
      )

    vi.stubGlobal('fetch', fetchMock)

    const orderService = await import('@/services/order.service')
    const settingsService = await import('@/services/settings.service')
    const { createCdekOrder } = await import('./cdek')

    vi.mocked(orderService.findOrderBrandIdForNotify).mockResolvedValue('inner')
    vi.mocked(orderService.findOrderWithItemsAndShippingForCdek).mockResolvedValue({
      id: 'order-1',
      shippingInfo: {
        deliveryMethod: 'cdek_pvz',
        cdekCityCode: 44,
        cdekTariffCode: 136,
        cdekPvzCode: 'SPB222',
        address: 'СДЭК ПВЗ SPB222: Санкт-Петербург, Невский проспект, 10',
        fullName: 'Покупатель',
        phone: '+79990000000',
        email: 'buyer@example.com',
      },
      items: [
        {
          productId: 'internal-id-1',
          quantity: 2,
          price: 150,
          product: {
            title: 'Товар с SKU',
            sku: 'SKU-001',
            weight: 100,
            length: 10,
            width: 20,
            height: 30,
          },
        },
        {
          productId: 'internal-id-2',
          quantity: 1,
          price: 250,
          product: {
            title: 'Товар без SKU',
            sku: '   ',
            weight: 200,
            length: 15,
            width: 25,
            height: 35,
          },
        },
      ],
    } as never)

    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(settingsService.getSettingsMap).mockImplementation(async () => {
      return {
        cdek_sender_name: 'Inner Health',
        cdek_sender_phone: '+74950000000',
        cdek_from_pvz_code: 'MSK123',
        cdek_sender_address: '',
        cdek_from_city_code: '',
        cdek_default_package_weight_g: '',
        cdek_default_package_length_mm: '',
        cdek_default_package_width_mm: '',
        cdek_default_package_height_mm: '',
      }
    })

    const result = await createCdekOrder('order-1')

    expect(result).toEqual({ uuid: 'cdek-uuid', trackNumber: 'TRACK-1' })
    expect(fetchMock).toHaveBeenCalledTimes(4)

    const orderRequest = fetchMock.mock.calls[2]
    expect(String(orderRequest?.[0])).toContain('/orders')

    const payload = JSON.parse(String((orderRequest?.[1] as RequestInit | undefined)?.body ?? '{}'))

    expect(payload.shipment_point).toBe('MSK123')
    expect(payload.delivery_point).toBe('SPB222')
    expect(payload).not.toHaveProperty('from_location')
    expect(payload.packages[0].items.map((item: { ware_key: string }) => item.ware_key)).toEqual([
      'SKU-001',
      'Товар без SKU',
    ])
    expect(JSON.stringify(payload)).not.toContain('internal-id-1')
    expect(JSON.stringify(payload)).not.toContain('internal-id-2')
  })

  it('keeps door delivery recipient address while still sending shipment_point', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 3600,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            code: 'MSK123',
            city_code: 44,
          },
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entity: {
            uuid: 'cdek-uuid-door',
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entity: {},
          requests: [],
        })
      )

    vi.stubGlobal('fetch', fetchMock)

    const orderService = await import('@/services/order.service')
    const settingsService = await import('@/services/settings.service')
    const { createCdekOrder } = await import('./cdek')

    vi.mocked(orderService.findOrderBrandIdForNotify).mockResolvedValue('inner')
    vi.mocked(orderService.findOrderWithItemsAndShippingForCdek).mockResolvedValue({
      id: 'order-2',
      shippingInfo: {
        deliveryMethod: 'cdek_door',
        cdekCityCode: 44,
        cdekTariffCode: 137,
        address: 'Москва, улица Пушкина, дом 10',
        street: 'улица Пушкина',
        house: '10',
        apartment: '12',
        entrance: '3',
        floor: '4',
        intercom: '45',
        fullName: 'Покупатель',
        phone: '+79990000000',
        email: 'buyer@example.com',
      },
      items: [
        {
          productId: 'internal-id-3',
          quantity: 1,
          price: 500,
          product: {
            title: 'Товар',
            sku: 'SKU-DOOR',
            weight: 100,
            length: 10,
            width: 20,
            height: 30,
          },
        },
      ],
    } as never)

    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(settingsService.getSettingsMap).mockImplementation(async () => {
      return {
        cdek_sender_name: 'Inner Health',
        cdek_sender_phone: '+74950000000',
        cdek_from_pvz_code: 'MSK123',
        cdek_sender_address: 'Москва, склад',
        cdek_from_city_code: '44',
        cdek_default_package_weight_g: '',
        cdek_default_package_length_mm: '',
        cdek_default_package_width_mm: '',
        cdek_default_package_height_mm: '',
      }
    })

    const result = await createCdekOrder('order-2')

    expect(result).toEqual({ uuid: 'cdek-uuid-door', trackNumber: null })

    expect(fetchMock).toHaveBeenCalledTimes(4)

    const orderRequest = fetchMock.mock.calls[2]
    const payload = JSON.parse(String((orderRequest?.[1] as RequestInit | undefined)?.body ?? '{}'))

    expect(payload.shipment_point).toBe('MSK123')
    expect(payload).not.toHaveProperty('delivery_point')
    expect(payload.to_location).toEqual({
      code: 44,
      country_code: 'RU',
      address: 'улица Пушкина, 10, 12, 3, 4, 45',
    })
    expect(payload).not.toHaveProperty('from_location')
  })

  it('returns business error when sender pvz setting is missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const orderService = await import('@/services/order.service')
    const settingsService = await import('@/services/settings.service')
    const { createCdekOrder } = await import('./cdek')

    vi.mocked(orderService.findOrderBrandIdForNotify).mockResolvedValue('inner')
    vi.mocked(orderService.findOrderWithItemsAndShippingForCdek).mockResolvedValue({
      id: 'order-3',
      shippingInfo: {
        deliveryMethod: 'cdek_door',
        cdekCityCode: 44,
        cdekTariffCode: 137,
        address: 'Москва, улица Пушкина, дом 10',
        street: 'улица Пушкина',
        house: '10',
        fullName: 'Покупатель',
        phone: '+79990000000',
        email: 'buyer@example.com',
      },
      items: [],
    } as never)

    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(settingsService.getSettingsMap).mockResolvedValue({
      cdek_sender_name: 'Inner Health',
      cdek_sender_phone: '+74950000000',
      cdek_from_pvz_code: '',
      cdek_sender_address: '',
      cdek_from_city_code: '',
    } as never)

    const result = await createCdekOrder('order-3')

    expect(result).toEqual({ error: 'Не задан код ПВЗ отправки СДЭК (cdek_from_pvz_code)' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
