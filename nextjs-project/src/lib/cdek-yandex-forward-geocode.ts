export interface StreetSuggestion {
  /** Название улицы (без типа, если Яндекс отдал отдельно — как есть) */
  street: string
  house: string | null
  /** Полный текст для показа в подсказке */
  text: string
}

interface YandexForwardResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          metaDataProperty?: {
            GeocoderMetaData?: {
              text?: string
              Address?: { Components?: Array<{ kind?: string; name?: string }> }
            }
          }
        }
      }>
    }
  }
}

/** Разбор ответа геокодера Яндекса в подсказки улиц. Дубликаты по улице+дому отбрасываются. */
export function parseYandexStreetSuggestions(payload: unknown): StreetSuggestion[] {
  const members =
    (payload as YandexForwardResponse | null)?.response?.GeoObjectCollection?.featureMember ?? []
  const seen = new Set<string>()
  const result: StreetSuggestion[] = []
  for (const member of members) {
    const meta = member.GeoObject?.metaDataProperty?.GeocoderMetaData
    const components = meta?.Address?.Components ?? []
    const street = components.find((c) => c.kind === 'street')?.name?.trim()
    if (!street) continue
    const house = components.find((c) => c.kind === 'house')?.name?.trim() || null
    const key = `${street}|${house ?? ''}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ street, house, text: meta?.text?.trim() || [street, house].filter(Boolean).join(', ') })
  }
  return result
}

export async function forwardGeocodeStreets(params: {
  city: string
  query: string
  apiKey: string
  signal?: AbortSignal
}): Promise<StreetSuggestion[]> {
  const url = new URL('https://geocode-maps.yandex.ru/1.x/')
  url.searchParams.set('apikey', params.apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('lang', 'ru_RU')
  url.searchParams.set('results', '8')
  url.searchParams.set('geocode', `Россия, ${params.city}, ${params.query}`)

  const response = await fetch(url.toString(), { cache: 'no-store', signal: params.signal })
  if (!response.ok) {
    console.warn('[cdek/streets] Yandex geocode failed', { status: response.status })
    return []
  }
  return parseYandexStreetSuggestions(await response.json())
}
