import { getCdekSuggestCities, type CdekCity } from '@/lib/cdek'
import type { CdekCredentials } from '@/lib/cdek'
import { reverseGeocodeYandexCoordinates } from '@/lib/cdek-yandex-reverse-geocode'

export interface CdekResolvedRegion {
  regionCode: number
  cityCode: number | null
  city: string | null
  region: string | null
  defaultLocation: string
}

function pickBestCity(cities: CdekCity[], locality: string | null): CdekCity | null {
  if (cities.length === 0) return null
  if (!locality) return cities[0] ?? null

  const normalizedLocality = locality.trim().toLowerCase()
  const exact = cities.find((city) => city.city?.trim().toLowerCase() === normalizedLocality)
  if (exact) return exact

  const partial = cities.find((city) => {
    const name = city.city?.trim().toLowerCase() ?? ''
    return name.length > 0 && (name.includes(normalizedLocality) || normalizedLocality.includes(name))
  })
  return partial ?? cities[0] ?? null
}

export async function resolveCdekRegionFromCoordinates(params: {
  latitude: number
  longitude: number
  yandexApiKey: string
  cdekCredentials: CdekCredentials
}): Promise<CdekResolvedRegion | null> {
  const geocoded = await reverseGeocodeYandexCoordinates({
    latitude: params.latitude,
    longitude: params.longitude,
    apiKey: params.yandexApiKey,
  })
  if (!geocoded) return null

  const lookupName = geocoded.locality ?? geocoded.province
  if (!lookupName) return null

  const cities = await getCdekSuggestCities(
    { name: lookupName, country_codes: ['RU'] },
    params.cdekCredentials
  )
  const city = pickBestCity(cities, geocoded.locality)
  if (!city?.region_code || city.region_code <= 0) return null

  return {
    regionCode: city.region_code,
    cityCode: city.code > 0 ? city.code : null,
    city: city.city ?? geocoded.locality,
    region: city.region ?? geocoded.province,
    defaultLocation: geocoded.formattedAddress || lookupName,
  }
}
