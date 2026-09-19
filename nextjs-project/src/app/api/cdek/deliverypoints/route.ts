import { NextResponse } from 'next/server'
import { getCdekCities, searchCdekDeliveryPoints } from '@/lib/cdek'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import * as settingsService from '@/services/settings.service'
import { getRegionOfficesFromDb } from '@/lib/cdek-db-cache-read'
import { pickCityPointsFromRegionCache } from '@/lib/cdek-cached-city-points'

/** city_code → region_code меняется редко; кэшируем в памяти процесса. */
const regionByCityCode = new Map<number, number>()

async function resolveRegionCode(cityCode: number, creds: Awaited<ReturnType<typeof settingsService.getCdekCredentials>>) {
  const known = regionByCityCode.get(cityCode)
  if (known) return known
  const [city] = await getCdekCities({ code: cityCode, size: 1 }, creds)
  const region = Number(city?.region_code)
  if (Number.isInteger(region) && region > 0) regionByCityCode.set(cityCode, region)
  return Number.isInteger(region) && region > 0 ? region : null
}

/**
 * GET /api/cdek/deliverypoints
 * Поиск пунктов выдачи (ПВЗ) СДЭК.
 * Query: cityCode (обязателен для поиска по городу), type (PVZ|POSTAMAT|ALL), postalCode, size, page, lang
 * all=1 (вместе с cityCode): регион города определяется на сервере, и сначала отдаём ВСЕ ПВЗ города из ночного Postgres-кэша
 * (без похода в api.cdek.ru, ответ `{ deliveryPoints, source: 'cache' }`); при промахе — обычный живой поиск.
 */
export async function GET(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const cdekCredentials = await settingsService.getCdekCredentials({ brandId })
    const { searchParams } = new URL(request.url)
    const cityCode = searchParams.get('cityCode')
    const postalCode = searchParams.get('postalCode')?.trim()
    const type = searchParams.get('type') as 'PVZ' | 'POSTAMAT' | 'ALL' | null
    const size = searchParams.get('size')
    const page = searchParams.get('page')
    const lang = (searchParams.get('lang') as 'rus' | 'eng') || 'rus'

    if (cityCode && searchParams.get('all') === '1') {
      try {
        const regionCode = await resolveRegionCode(Number(cityCode), cdekCredentials)
        const hit = regionCode ? await getRegionOfficesFromDb(regionCode) : null
        if (hit) {
          const fromCache = pickCityPointsFromRegionCache(hit.payload, Number(cityCode))
          if (fromCache.length > 0) {
            return NextResponse.json({ deliveryPoints: fromCache, source: 'cache' })
          }
        }
      } catch (e) {
        console.warn('CDEK deliverypoints: db cache read failed, fallback to live', e)
      }
    }

    if (!cityCode && !postalCode) {
      return NextResponse.json(
        { error: 'Укажите cityCode или postalCode' },
        { status: 400 }
      )
    }

    const deliveryPoints = await searchCdekDeliveryPoints({
      filter: {
        ...(cityCode ? { city_code: Number(cityCode) } : undefined),
        ...(postalCode ? { postal_code: postalCode } : undefined),
        ...(type && ['PVZ', 'POSTAMAT', 'ALL'].includes(type) ? { type } : undefined),
      },
      size: size ? Math.min(50, Math.max(1, parseInt(size, 10))) : 20,
      page: page ? Math.max(0, parseInt(page, 10)) : 0,
      lang,
    }, cdekCredentials)

    const withCoords = deliveryPoints.filter(
      (p) => p.location?.latitude != null && p.location?.longitude != null
    )
    if (deliveryPoints.length > 0 && withCoords.length === 0) {
      console.warn(
        'CDEK deliverypoints: got',
        deliveryPoints.length,
        'points but none with coordinates. First point keys:',
        Object.keys(deliveryPoints[0] ?? {}),
        'location:',
        (deliveryPoints[0] as { location?: unknown })?.location
      )
    } else if (deliveryPoints.length > 0) {
      console.info('CDEK deliverypoints: cityCode=%s, total=%d, withCoords=%d', cityCode, deliveryPoints.length, withCoords.length)
    }

    return NextResponse.json({ deliveryPoints })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка поиска ПВЗ СДЭК'
    console.error('CDEK deliverypoints error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
