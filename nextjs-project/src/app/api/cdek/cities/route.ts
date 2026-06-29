import { NextResponse } from 'next/server'
import {
  CDEK_CIS_COUNTRY_CODES,
  filterCdekCitiesToCis,
  getCdekCities,
  getCdekSuggestCities,
} from '@/lib/cdek'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import * as settingsService from '@/services/settings.service'

function normalizeCityCode(cities: ReturnType<typeof filterCdekCitiesToCis>) {
  return cities
    .map((c) => {
      const row = c as unknown as Record<string, unknown>
      const code = row.code ?? row.city_code
      return { ...c, code: code != null ? Number(code) : undefined }
    })
    .filter((c) => {
      const code = (c as unknown as { code?: number }).code
      return code != null && code !== 0
    })
}

/**
 * GET /api/cdek/cities
 * Список городов СДЭК (Location).
 * Query: q (название города), regionCode, postalCode, size, page, lang
 */
export async function GET(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const cdekCredentials = await settingsService.getCdekCredentials({ brandId })
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const regionCode = searchParams.get('regionCode')
    const postalCode = searchParams.get('postalCode')?.trim()
    const size = searchParams.get('size')
    const page = searchParams.get('page')
    const lang = (searchParams.get('lang') as 'rus' | 'eng') || 'rus'

    const requestedSize = size ? Math.min(100, Math.max(1, parseInt(size, 10))) : 20
    const requestedPage = page ? Math.max(0, parseInt(page, 10)) : 0
    const cisCountryCodes = [...CDEK_CIS_COUNTRY_CODES]

    let raw = q
      ? await getCdekSuggestCities({ name: q, country_codes: cisCountryCodes }, cdekCredentials)
      : []

    if (q && raw.length === 0) {
      raw = await getCdekCities(
        {
          country_codes: cisCountryCodes,
          city: q,
          ...(regionCode ? { region_code: Number(regionCode) } : undefined),
          ...(postalCode ? { postal_code: postalCode } : undefined),
          size: requestedSize,
          page: requestedPage,
          lang,
        },
        cdekCredentials
      )
    } else if (!q) {
      raw = await getCdekCities(
        {
          country_codes: cisCountryCodes,
          ...(regionCode ? { region_code: Number(regionCode) } : undefined),
          ...(postalCode ? { postal_code: postalCode } : undefined),
          size: requestedSize,
          page: requestedPage,
          lang,
        },
        cdekCredentials
      )
    }

    raw = filterCdekCitiesToCis(raw)

    const cities = normalizeCityCode(raw).slice(0, requestedSize)

    if (raw.length > 0 && cities.length === 0) {
      console.warn(
        'CDEK cities: raw count=%d but all filtered out. First raw keys:',
        raw.length,
        Object.keys((raw[0] as unknown as Record<string, unknown>) ?? {})
      )
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
