import { NextResponse } from 'next/server'
import { getCdekCities } from '@/lib/cdek'

/**
 * GET /api/cdek/cities
 * Список городов СДЭК (Location).
 * Query: q (название города), regionCode, postalCode, size, page, lang
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const regionCode = searchParams.get('regionCode')
    const postalCode = searchParams.get('postalCode')?.trim()
    const size = searchParams.get('size')
    const page = searchParams.get('page')
    const lang = (searchParams.get('lang') as 'rus' | 'eng') || 'rus'

    const requestedSize = size ? Math.min(100, Math.max(1, parseInt(size, 10))) : 20
    const requestedPage = page ? Math.max(0, parseInt(page, 10)) : 0

    let raw = await getCdekCities({
      country_codes: ['RU'],
      ...(q ? { city: q } : undefined),
      ...(regionCode ? { region_code: Number(regionCode) } : undefined),
      ...(postalCode ? { postal_code: postalCode } : undefined),
      size: requestedSize,
      page: requestedPage,
      lang,
    })

    /** Если по запросу ничего не вернулось — запрашиваем без фильтра city и фильтруем по названию на своей стороне */
    if (q && raw.length === 0) {
      const all = await getCdekCities({
        country_codes: ['RU'],
        size: 500,
        page: 0,
        lang,
      })
      const qLower = q.toLowerCase().trim()
      raw = all.filter((c) => {
        const name = (c.city ?? (c as Record<string, unknown>).cityName ?? (c as Record<string, unknown>).name ?? '').toString().toLowerCase()
        return name.includes(qLower) || name.startsWith(qLower)
      })
    }

    /** Нормализуем code: СДЭК может вернуть code или city_code */
    const cities = raw
      .map((c) => {
        const row = c as Record<string, unknown>
        const code = row.code ?? row.city_code
        return { ...c, code: code != null ? Number(code) : undefined }
      })
      .filter((c) => {
        const code = (c as { code?: number }).code
        return code != null && code !== 0
      })
      .slice(0, requestedSize)

    if (raw.length > 0 && cities.length === 0) {
      console.warn('CDEK cities: raw count=%d but all filtered out. First raw keys:', raw.length, Object.keys((raw[0] as Record<string, unknown>) ?? {}))
    } else if (cities.length > 0) {
      console.info('CDEK cities: q=%s, returning %d cities', q ?? '(all)', cities.length)
    }

    return NextResponse.json({ cities })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка запроса городов СДЭК'
    console.error('CDEK cities error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
