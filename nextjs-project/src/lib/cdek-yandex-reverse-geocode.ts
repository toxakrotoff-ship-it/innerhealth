interface YandexGeocoderResponse {
  response?: {
    GeoObjectCollection?: {
      featureMember?: Array<{
        GeoObject?: {
          metaDataProperty?: {
            GeocoderMetaData?: {
              text?: string
              Address?: {
                Components?: Array<{
                  kind?: string
                  name?: string
                }>
              }
            }
          }
        }
      }>
    }
  }
}

export interface YandexReverseGeocodeResult {
  formattedAddress: string
  locality: string | null
  province: string | null
}

function readComponent(
  components: Array<{ kind?: string; name?: string }> | undefined,
  kind: string
): string | null {
  if (!components) return null
  const match = components.find((component) => component.kind === kind)
  const name = match?.name?.trim()
  return name && name.length > 0 ? name : null
}

export async function reverseGeocodeYandexCoordinates(params: {
  latitude: number
  longitude: number
  apiKey: string
}): Promise<YandexReverseGeocodeResult | null> {
  const url = new URL('https://geocode-maps.yandex.ru/1.x/')
  url.searchParams.set('apikey', params.apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('lang', 'ru_RU')
  url.searchParams.set('results', '1')
  url.searchParams.set('geocode', `${params.longitude},${params.latitude}`)

  const response = await fetch(url.toString(), { cache: 'no-store' })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('[cdek/geocoder] Yandex reverse geocode request failed', {
      status: response.status,
      body: body.slice(0, 500),
    })
    return null
  }

  const payload = (await response.json()) as YandexGeocoderResponse
  const geoObject = payload.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
  const metadata = geoObject?.metaDataProperty?.GeocoderMetaData
  if (!metadata) {
    console.error('[cdek/geocoder] Yandex reverse geocode returned no GeocoderMetaData', {
      hasFeatureMember: !!payload.response?.GeoObjectCollection?.featureMember?.length,
    })
    return null
  }

  const components = metadata.Address?.Components
  const locality =
    readComponent(components, 'locality') ??
    readComponent(components, 'area') ??
    readComponent(components, 'district')
  const province =
    readComponent(components, 'province') ??
    readComponent(components, 'area')

  const formattedAddress = metadata.text?.trim() ?? ''
  if (!formattedAddress && !locality && !province) return null

  return {
    formattedAddress: formattedAddress || [locality, province].filter(Boolean).join(', '),
    locality,
    province,
  }
}
