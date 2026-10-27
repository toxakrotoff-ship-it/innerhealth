import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { getOzonDeliveryConfig } from '@/lib/ozon-delivery/config'
import { ozonErrorResponse, ozonRateLimit } from '@/lib/ozon-delivery/http'
import { OzonCheckoutError } from '@/lib/ozon-delivery/parcel'
import { ozonAddressSearchWords, ozonCityAddressPattern, ozonCitySearchName, ozonCitySuggestionPattern, ozonNonLocalityPattern } from '@/lib/ozon-delivery/search'
import { getYandexMapsApiKey } from '@/services/settings.service'
import { normalizeOzonPvzCity, ozonPvzAddressCities } from '@/lib/ozon-pvz-city'

export async function GET(request: Request) {
  const limited = await ozonRateLimit(request)
  if (limited) return limited
  const params = new URL(request.url).searchParams
  const parsed = z.object({
    city: z.string().trim().min(2).max(100).refine(value => {
      const name = ozonCitySearchName(value)
      return name.length >= 2 && /\p{L}/u.test(name)
    }).optional(),
    query: z.string().trim().max(100).optional(),
    suggestCities: z.enum(['true']).optional(),
    view: z.enum(['map', 'list']).optional(),
  }).refine(value => Boolean(value.city) || (value.query?.length ?? 0) >= 2)
    .refine(value => value.view !== 'map' || Boolean(value.city && ozonPvzAddressCities(value.city).includes(normalizeOzonPvzCity(value.city))))
    .safeParse({
    city: params.get('city') ?? undefined, query: params.get('query') ?? undefined,
    suggestCities: params.get('suggestCities') ?? undefined,
    view: params.get('view') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Укажите город доставки (от 2 до 100 символов)' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  try {
    const brand = resolveBrandOrDefaultFromRequest(request)
    if (!await getOzonDeliveryConfig(brand)) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
    const freshConditions = [Prisma.sql`"brand" = ${brand}`, Prisma.sql`"syncedAt" >= ${new Date(Date.now() - 48 * 3600000)}`]
    let cities: string[] | undefined
    if (parsed.data.suggestCities && parsed.data.city) {
      // Use the active storefront's existing pickup cache, without another provider or API key.
      const suggestions = await prisma.$queryRaw<Array<{ city: string }>>(Prisma.sql`
        SELECT DISTINCT city FROM (
          SELECT trim(parts[1]) AS city
          FROM "OzonDeliveryPointCache"
          CROSS JOIN LATERAL regexp_matches(address, ${ozonCitySuggestionPattern(parsed.data.city)}, 'gi') AS locality(parts)
          WHERE ${Prisma.join(freshConditions, ' AND ')}
        ) AS localities
        WHERE length(city) BETWEEN 2 AND 100 AND city !~* ${ozonNonLocalityPattern}
        ORDER BY city LIMIT 12
      `)
      cities = suggestions.map(row => row.city)
    }
    const conditions = [...freshConditions]
    if (parsed.data.city) conditions.push(Prisma.sql`address ~* ${ozonCityAddressPattern(parsed.data.city)}`)
    for (const word of ozonAddressSearchWords(parsed.data.query || '')) {
      const escaped = word.replace(/[\\%_]/g, '\\$&')
      conditions.push(Prisma.sql`translate(lower(address), 'ё', 'е') ILIKE ${`%${escaped}%`}`)
    }
    const mapView = parsed.data.view === 'map'
    const points = await prisma.$queryRaw<Array<{ pointId: string; name: string; address: string; latitude: number | null; longitude: number | null }>>(Prisma.sql`
      SELECT "pointId", name, address, latitude, longitude FROM "OzonDeliveryPointCache"
      WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY address, "pointId" ${mapView ? Prisma.empty : Prisma.sql`LIMIT 31`}
    `)
    const mapApiKey = await getYandexMapsApiKey({ brandId: brand }).catch(() => undefined)
    return NextResponse.json({
      points: (mapView ? points : points.slice(0, 30)).map(p => ({
        id: Number(p.pointId), name: p.name, address: p.address,
        ...(p.latitude != null && p.longitude != null ? { coordinates: { latitude: p.latitude, longitude: p.longitude } } : {}),
      })),
      hasMore: !mapView && points.length > 30, mapApiKey, ...(cities ? { cities } : {}),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonErrorResponse(error) }
}
