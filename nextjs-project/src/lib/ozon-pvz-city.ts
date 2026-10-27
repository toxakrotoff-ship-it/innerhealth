import { ozonCitySearchName } from './ozon-delivery/search'

/** Shared between the origin pointer, publication and browser validation. */
export function normalizeOzonPvzCity(city: string): string {
  return ozonCitySearchName(city).normalize('NFC').trim()
    .replace(/^(?:(?:г|п|пос|с|д|рп|пгт)\.\s*|(?:город|г|п|пос|пос[её]лок|с|село|д|деревня|рп|пгт)\s+)/i, '')
    .replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
}

const countries = new Set(['россия', 'российская федерация', 'рф', 'russia', 'беларусь', 'казахстан', 'кыргызстан', 'киргизия', 'армения', 'узбекистан', 'азербайджан', 'таджикистан', 'грузия', 'китай', 'турция'])
const administrative = /(^|\s)(область|обл\.?|край|республика|респ\.?|район|р-н|округ|ао|муниципальный)(\s|$)/iu
const street = /(^|\s)(улица|ул\.?|проспект|пр-?кт|переулок|пер\.?|шоссе|ш\.?|площадь|пл\.?|бульвар|бул\.?|набережная|наб\.?|проезд|пр-д|тракт|аллея|тупик|микрорайон|мкр\.?|квартал)(\s|$)/iu

/** Locality candidates from public comma-delimited addresses; unknown cities use the API. */
export function ozonPvzAddressCities(address: string): string[] {
  const result = new Set<string>()
  for (const raw of address.split(',').slice(0, 8)) {
    const part = normalizeOzonPvzCity(raw)
    if (!part || countries.has(part) || /^\d{6}$/.test(part)) continue
    if (/^(?:(?:дом|д|корпус|к|строение|стр|квартира|кв)\.?\s*)?\d/iu.test(part) || street.test(part)) break
    if (part.length < 2 || part.length > 100 || administrative.test(part)) continue
    result.add(part)
  }
  return [...result]
}
