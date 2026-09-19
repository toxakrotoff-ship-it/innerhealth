import { NextResponse } from 'next/server'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { forwardGeocodeStreets } from '@/lib/cdek-yandex-forward-geocode'
import * as settingsService from '@/services/settings.service'

/**
 * GET /api/cdek/streets?q=оре&city=Москва
 * Подсказки улиц для доставки до двери (у API СДЭК v2 нет suggest по улицам, только по городам).
 * Ошибки не блокируют оформление: при сбое возвращаем пустой список, поле остаётся свободным вводом.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const city = searchParams.get('city')?.trim() ?? ''
  if (q.length < 2 || !city || q.length > 100 || city.length > 100) {
    return NextResponse.json({ suggestions: [] })
  }
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const apiKey = await settingsService.getYandexMapsApiKey({ brandId })
    if (!apiKey) return NextResponse.json({ suggestions: [] })
    const suggestions = await forwardGeocodeStreets({
      city,
      query: q,
      apiKey,
      signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.warn('[cdek/streets] failed', e instanceof Error ? e.message : e)
    return NextResponse.json({ suggestions: [] })
  }
}
