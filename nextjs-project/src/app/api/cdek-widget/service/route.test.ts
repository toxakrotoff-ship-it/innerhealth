import { describe, expect, it } from 'vitest'
import { normalizeWidgetPayload } from '@/lib/cdek-widget-payload'

describe('normalizeWidgetPayload', () => {
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
})
