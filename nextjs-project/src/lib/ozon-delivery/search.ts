/** Common city aliases and separators accepted by the pickup search. */
export function ozonCitySearchName(city: string): string {
  const name = city.trim().replace(/^(?:город\s+|г\.\s*|г\s+)/i, '').trim()
  const alias = name.toLocaleLowerCase('ru').replace(/[.\s-]/g, '')
  if (['спб', 'питер', 'санктпетербург'].includes(alias)) return 'Санкт-Петербург'
  if (alias === 'мск') return 'Москва'
  return name
}

function cityNamePattern(city: string): string {
  return ozonCitySearchName(city).split(/[\s\-–—]+/).map(part => part
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[её]/gi, '[её]'))
    .join('[[:space:]–—-]+')
}

const localityPrefix = '(?:(?:г|п|пос|с|д|рп|пгт)[.][[:space:]]*|(?:г|город|п|пос|пос[её]лок|с|село|д|деревня|рп|пгт)[[:space:]]+)?'

/** A whole comma-delimited locality; never broaden point search to nearby cities. */
export function ozonCityAddressPattern(city: string): string {
  return `(^|,)[[:space:]]*${localityPrefix}${cityNamePattern(city)}[[:space:]]*(,|$)`
}

/** Capture names without consuming the next comma, so adjacent locality matches remain visible. */
export function ozonCitySuggestionPattern(city: string): string {
  return `(?:^|,)[[:space:]]*${localityPrefix}(${cityNamePattern(city)}[^,]*)(?=,|$)`
}

export const ozonNonLocalityPattern = '(^|[[:space:]])(область|обл[.]?|край|республика|респ[.]?|район|р-н|округ|ао|улица|ул[.]?|проспект|пр-кт|пр-т|шоссе|переулок|пер[.]?|набережная|проезд)([[:space:]]|$)|^([0-9]+|Россия|РФ|Российская федерация|Russia|Беларусь|Казахстан|Кыргызстан|Киргизия|Армения|Узбекистан|Азербайджан|Таджикистан|Грузия|Китай|Турция)$'

/** Ignore address labels and punctuation so “ул. Тверская, д. 10” also works. */
export function ozonAddressSearchWords(query: string): string[] {
  const labels = /^(?:ул|улица|д|дом|г|город|пр|пр-т|пр-кт|просп|проспект|пер|переулок|ш|шоссе|наб|набережная|корп|корпус|стр|строение)$/i
  return query.split(/[\s,.;]+/).filter(word => word && !labels.test(word))
    .map(word => word.toLocaleLowerCase('ru').replace(/ё/g, 'е'))
}
