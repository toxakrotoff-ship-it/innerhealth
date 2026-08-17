import { getCdekCities, getCdekSuggestCities, type CdekCity } from '@/lib/cdek'
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

async function enrichCityWithRegionCode(
  city: CdekCity,
  cdekCredentials: CdekCredentials
): Promise<CdekCity | null> {
  if (city.region_code != null && city.region_code > 0) return city

  if (city.code > 0) {
    const byCode = await getCdekCities(
      { code: city.code, country_codes: ['RU'], size: 1 },
      cdekCredentials
    )
    const enriched = byCode[0]
    if (enriched?.region_code != null && enriched.region_code > 0) {
      return { ...city, ...enriched }
    }
  }

  if (city.city?.trim()) {
    const byName = await getCdekCities(
      { city: city.city.trim(), country_codes: ['RU'], size: 10 },
      cdekCredentials
    )
    const exact =
      byName.find((row) => row.code === city.code) ??
      byName.find(
        (row) => row.city?.trim().toLowerCase() === city.city?.trim().toLowerCase()
      ) ??
      byName[0]
    if (exact?.region_code != null && exact.region_code > 0) {
      return { ...city, ...exact }
    }
  }

  return null
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
  if (!geocoded) {
    console.warn('[cdek/geo-region] reverse geocode failed, aborting region resolution', {
      latitude: params.latitude,
      longitude: params.longitude,
    })
    return null
  }

  const lookupName = geocoded.locality ?? geocoded.province
  if (!lookupName) {
    console.warn('[cdek/geo-region] reverse geocode returned no locality/province', {
      formattedAddress: geocoded.formattedAddress,
    })
    return null
  }

  let cities = await getCdekSuggestCities(
    { name: lookupName, country_codes: ['RU'] },
    params.cdekCredentials
  )
  let city = pickBestCity(cities, geocoded.locality)

  if (!city && geocoded.province && geocoded.province !== lookupName) {
    cities = await getCdekSuggestCities(
      { name: geocoded.province, country_codes: ['RU'] },
      params.cdekCredentials
    )
    city = pickBestCity(cities, geocoded.locality)
  }

  if (!city) {
    const byLocality = await getCdekCities(
      { city: lookupName, country_codes: ['RU'], size: 10 },
      params.cdekCredentials
    )
    city = pickBestCity(byLocality, geocoded.locality)
  }

  if (!city) {
    console.warn('[cdek/geo-region] no CDEK city matched for locality', {
      lookupName,
      locality: geocoded.locality,
      province: geocoded.province,
    })
    return null
  }

  const cityWithRegion = await enrichCityWithRegionCode(city, params.cdekCredentials)
  if (!cityWithRegion?.region_code || cityWithRegion.region_code <= 0) {
    console.warn('[cdek/geo-region] matched CDEK city has no region_code after enrichment', {
      cityCode: city.code,
      cityName: city.city,
    })
    return null
  }

  return {
    regionCode: cityWithRegion.region_code,
    cityCode: cityWithRegion.code > 0 ? cityWithRegion.code : null,
    city: cityWithRegion.city ?? geocoded.locality,
    region: cityWithRegion.region ?? geocoded.province,
    defaultLocation: geocoded.formattedAddress || lookupName,
  }
}
