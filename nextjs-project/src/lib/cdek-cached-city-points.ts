import type { CdekPvzOption } from '@/components/site/delivery-section'

interface RawCachedPoint {
  code?: unknown
  name?: unknown
  work_time?: unknown
  city_code?: unknown
  location?: {
    city_code?: unknown
    address?: unknown
    address_full?: unknown
    latitude?: unknown
    longitude?: unknown
  }
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** ПВЗ одного города из региональной выгрузки ночного кэша (сырой формат СДЭК). */
export function pickCityPointsFromRegionCache(payload: unknown[], cityCode: number): CdekPvzOption[] {
  const result: CdekPvzOption[] = []
  for (const item of payload) {
    const raw = item as RawCachedPoint | null
    if (!raw || typeof raw !== 'object') continue
    const itemCity = Number(raw.location?.city_code ?? raw.city_code)
    if (itemCity !== cityCode) continue
    const code = str(raw.code)
    if (!code) continue
    const address = str(raw.location?.address)
    result.push({
      code,
      name: str(raw.name),
      address,
      full_address: str(raw.location?.address_full) ?? address,
      work_time: str(raw.work_time),
      location: {
        latitude: typeof raw.location?.latitude === 'number' ? raw.location.latitude : undefined,
        longitude: typeof raw.location?.longitude === 'number' ? raw.location.longitude : undefined,
      },
    })
  }
  return result
}
