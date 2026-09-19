import { describe, expect, it } from 'vitest'
import { pickCityPointsFromRegionCache } from './cdek-cached-city-points'

describe('pickCityPointsFromRegionCache', () => {
  it('оставляет ПВЗ нужного города и нормализует поля', () => {
    const payload = [
      { code: 'MSK1', name: 'Первый', work_time: 'Пн-Вс 10-20', location: { city_code: 44, address: 'ул. Ореховая, 1', address_full: 'Москва, ул. Ореховая, 1', latitude: 55.1, longitude: 37.2 } },
      { code: 'SPB1', location: { city_code: 137, address: 'Невский, 1' } },
      { name: 'без кода', location: { city_code: 44 } },
      null,
    ]
    expect(pickCityPointsFromRegionCache(payload, 44)).toEqual([
      {
        code: 'MSK1',
        name: 'Первый',
        address: 'ул. Ореховая, 1',
        full_address: 'Москва, ул. Ореховая, 1',
        work_time: 'Пн-Вс 10-20',
        location: { latitude: 55.1, longitude: 37.2 },
      },
    ])
  })
})
