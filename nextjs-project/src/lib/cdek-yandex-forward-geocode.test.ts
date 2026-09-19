import { describe, expect, it } from 'vitest'
import { parseYandexStreetSuggestions } from './cdek-yandex-forward-geocode'

const member = (text: string, comps: Array<{ kind: string; name: string }>) => ({
  GeoObject: { metaDataProperty: { GeocoderMetaData: { text, Address: { Components: comps } } } },
})

describe('parseYandexStreetSuggestions', () => {
  it('достаёт улицу и дом, отбрасывает дубли и объекты без улицы', () => {
    const payload = {
      response: {
        GeoObjectCollection: {
          featureMember: [
            member('Россия, Москва, Ореховый бульвар, 1', [
              { kind: 'street', name: 'Ореховый бульвар' },
              { kind: 'house', name: '1' },
            ]),
            member('дубль', [
              { kind: 'street', name: 'Ореховый бульвар' },
              { kind: 'house', name: '1' },
            ]),
            member('Москва', [{ kind: 'locality', name: 'Москва' }]),
          ],
        },
      },
    }
    expect(parseYandexStreetSuggestions(payload)).toEqual([
      { street: 'Ореховый бульвар', house: '1', text: 'Россия, Москва, Ореховый бульвар, 1' },
    ])
  })
  it('мусорный ответ → пусто', () => {
    expect(parseYandexStreetSuggestions(null)).toEqual([])
  })
})
