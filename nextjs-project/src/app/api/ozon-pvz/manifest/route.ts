import { NextResponse } from 'next/server'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { readOzonPvzCityManifest } from '@/lib/ozon-pvz-publication'
import { getYandexMapsApiKey } from '@/services/settings.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  const city = new URL(request.url).searchParams.get('city')?.trim() || ''
  if (city.length < 2 || city.length > 100) return NextResponse.json({ error: 'Укажите город' }, { status: 400, headers })
  try {
    const brand = resolveBrandOrDefaultFromRequest(request)
    const manifest = await readOzonPvzCityManifest(brand, city)
    const mapApiKey = await getYandexMapsApiKey({ brandId: brand }).catch(() => undefined)
    return NextResponse.json({ ...manifest, mapApiKey }, { headers })
  } catch { return NextResponse.json({ error: 'Ozon point publication unavailable' }, { status: 503, headers }) }
}
