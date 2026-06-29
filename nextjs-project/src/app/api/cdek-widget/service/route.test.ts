import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { normalizeWidgetPayload } from '@/lib/cdek-widget-payload'
import { clearSharedOfficesCacheForTests } from '@/lib/cdek-offices-cache'

vi.mock('@/services/settings.service', () => ({
  getCdekCredentials: vi.fn(),
}))

vi.mock('@/lib/cdek', () => ({
  calculateCdekTariffList: vi.fn(),
  getCdekToken: vi.fn(),
  resolveCdekSenderSettings: vi.fn(),
}))

const settingsService = await import('@/services/settings.service')
const cdek = await import('@/lib/cdek')

describe('normalizeWidgetPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSharedOfficesCacheForTests()
  })

  it('strips sender address and prefers sender code for widget calculate payloads', () => {
    const payload = normalizeWidgetPayload({
      action: 'calculate',
      from: {
        code: '44',
        postal_code: '190000',
        address: 'Санкт-Петербург, Невский проспект, 1',
        country_code: 'RU',
      },
      to: {
        city_uuid: 'b308dcad-dbf0-4b22-bf2b-efca9f72ae38',
        address: 'Кудрово, Центральная ул. 50к1',
        country_code: 'RU',
      },
      goods: [{ weight: 100, length: 10, width: 20, height: 30 }],
    })

    expect(payload.from_location).toEqual({
      code: 44,
      country_code: 'RU',
    })
    expect(payload.to_location).toEqual({
      city_uuid: 'b308dcad-dbf0-4b22-bf2b-efca9f72ae38',
      address: 'Кудрово, Центральная ул. 50к1',
      country_code: 'RU',
    })
    expect(payload.packages).toEqual([{ weight: 100, length: 10, width: 20, height: 30 }])
  })

  it('calculates only office tariff for PVZ selection', async () => {
    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(cdek.resolveCdekSenderSettings).mockResolvedValue({
      ok: true,
      settings: {
        fromPvzCode: 'SPB55',
        fromCityCode: 137,
        senderAddress: 'Санкт-Петербург, склад',
        senderName: 'Inner Health',
        senderPhone: '+78120000000',
        scopeUsed: 'global',
        fromPostalCode: null,
        calculatorFromLocation: {
          code: 137,
          country_code: 'RU',
        },
      },
    })
    vi.mocked(cdek.calculateCdekTariffList).mockResolvedValue([
      {
        tariff_code: 136,
        tariff_name: 'Посылка склад-склад',
        delivery_mode: 4,
        delivery_sum: 490,
        period_min: 2,
        period_max: 3,
      },
    ])

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/service?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate',
          from: {
            code: 44,
            address: 'Москва, старый склад',
            country_code: 'RU',
          },
          to: {
            code: 1661,
            country_code: 'RU',
          },
          goods: [{ weight: 100, length: 10, width: 20, height: 30 }],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      tariff_codes: [
        {
          tariff_code: 136,
          tariff_name: 'Посылка склад-склад',
          delivery_mode: 4,
          delivery_sum: 490,
          period_min: 2,
          period_max: 3,
        },
      ],
    })
    expect(cdek.calculateCdekTariffList).toHaveBeenCalledTimes(1)
    expect(cdek.calculateCdekTariffList).toHaveBeenCalledWith(
      expect.objectContaining({
        from_location: {
          code: 137,
          country_code: 'RU',
        },
        to_location: {
          code: 1661,
          country_code: 'RU',
        },
        packages: [{ weight: 100, length: 10, width: 20, height: 30 }],
        tariff_codes: [136],
      }),
      {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        useTest: false,
      }
    )
  })

  it('calculates only door tariff for door selection', async () => {
    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(cdek.resolveCdekSenderSettings).mockResolvedValue({
      ok: true,
      settings: {
        fromPvzCode: 'SPB55',
        fromCityCode: 137,
        senderAddress: 'Санкт-Петербург, склад',
        senderName: 'Inner Health',
        senderPhone: '+78120000000',
        scopeUsed: 'global',
        fromPostalCode: null,
        calculatorFromLocation: {
          code: 137,
          country_code: 'RU',
        },
      },
    })
    vi.mocked(cdek.calculateCdekTariffList).mockResolvedValue([
      {
        tariff_code: 137,
        tariff_name: 'Посылка склад-дверь',
        delivery_mode: 3,
        delivery_sum: 690,
        period_min: 2,
        period_max: 3,
      },
    ])

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/service?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate',
          from: {
            code: 44,
            address: 'Москва, старый склад',
            country_code: 'RU',
          },
          to: {
            address: 'Кудрово, Центральная ул. 50к1',
            country_code: 'RU',
          },
          goods: [{ weight: 100, length: 10, width: 20, height: 30 }],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      tariff_codes: [
        {
          tariff_code: 137,
          tariff_name: 'Посылка склад-дверь',
          delivery_mode: 3,
          delivery_sum: 690,
          period_min: 2,
          period_max: 3,
        },
      ],
    })
    expect(cdek.calculateCdekTariffList).toHaveBeenCalledTimes(1)
    expect(cdek.calculateCdekTariffList).toHaveBeenCalledWith(
      expect.objectContaining({
        from_location: {
          code: 137,
          country_code: 'RU',
        },
        to_location: {
          address: 'Кудрово, Центральная ул. 50к1',
          country_code: 'RU',
        },
        packages: [{ weight: 100, length: 10, width: 20, height: 30 }],
        tariff_codes: [137],
      }),
      {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        useTest: false,
      }
    )
  })

  it('injects city_code and x-total-elements for local offices probe', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ code: 'A' }, { code: 'B' }]),
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', fetchMock)

    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(cdek.getCdekToken).mockResolvedValue('token')
    vi.mocked(cdek.resolveCdekSenderSettings).mockResolvedValue({
      ok: true,
      settings: {
        fromPvzCode: 'MSK1',
        fromCityCode: 44,
        senderAddress: 'Москва',
        senderName: 'Inner Health',
        senderPhone: '+78120000000',
        scopeUsed: 'global',
        fromPostalCode: null,
        calculatorFromLocation: { code: 44, country_code: 'RU' },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/service?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offices',
          is_handout: true,
          page: 1,
          size: 1,
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-total-elements')).toBe('2')
    const body = await response.json()
    expect(body).toEqual([{ code: 'A' }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('city_code=44')
  })

  it('loads country offices probe without city filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ code: 'A' }, { code: 'B' }]),
      headers: new Headers(),
    })
    vi.stubGlobal('fetch', fetchMock)

    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })
    vi.mocked(cdek.getCdekToken).mockResolvedValue('token')
    vi.mocked(cdek.resolveCdekSenderSettings).mockResolvedValue({
      ok: true,
      settings: {
        fromPvzCode: 'MSK1',
        fromCityCode: 44,
        senderAddress: 'Москва',
        senderName: 'Inner Health',
        senderPhone: '+78120000000',
        scopeUsed: 'global',
        fromPostalCode: null,
        calculatorFromLocation: { code: 44, country_code: 'RU' },
      },
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/service?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offices',
          offices_scope: 'country',
          is_handout: true,
          page: 1,
          size: 1,
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-total-elements')).toBe('2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('city_code=')
  })

  it('skips calculate when destination is empty', async () => {
    vi.mocked(settingsService.getCdekCredentials).mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      useTest: false,
    })

    const response = await POST(
      new Request('http://localhost/api/cdek-widget/service?brand=inner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate',
          from: {
            code: 44,
            country_code: 'RU',
          },
          to: {},
          goods: [{ weight: 100, length: 10, width: 20, height: 30 }],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      tariff_codes: [],
      ok: false,
      code: 'EMPTY_DESTINATION',
      message: 'Недостаточно данных для расчета доставки',
    })
    expect(cdek.resolveCdekSenderSettings).not.toHaveBeenCalled()
    expect(cdek.calculateCdekTariffList).not.toHaveBeenCalled()
  })
})
