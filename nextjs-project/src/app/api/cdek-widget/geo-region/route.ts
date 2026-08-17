import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveCdekRegionFromCoordinates } from '@/lib/cdek-resolve-region-from-coords'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import * as settingsService from '@/services/settings.service'

const GEO_REGION_RATE_LIMIT = 15

const bodySchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
})

export async function POST(request: Request) {
  try {
    const clientId = getClientIdentifier(request)
    const rate = await checkRateLimit(clientId, 'cdek-widget-geo-region', GEO_REGION_RATE_LIMIT)
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.resetIn),
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const brandId = resolveBrandOrDefaultFromRequest(request)
    const cdekCredentials = await settingsService.getCdekCredentials({ brandId })
    if (!cdekCredentials) {
      return NextResponse.json({ error: 'CDEK credentials are missing' }, { status: 400 })
    }

    const apiKey = await settingsService.getYandexMapsApiKey({ brandId })
    if (!apiKey) {
      return NextResponse.json({ error: 'Yandex Maps API key is missing' }, { status: 500 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const resolved = await resolveCdekRegionFromCoordinates({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      yandexApiKey: apiKey,
      cdekCredentials,
    })

    if (!resolved) {
      console.warn('[cdek/widget][geo-region] region resolution failed, widget will fall back', {
        brandId,
        hasApiKey: !!apiKey,
      })
      return NextResponse.json({ region: null })
    }

    return NextResponse.json({
      region: {
        regionCode: resolved.regionCode,
        cityCode: resolved.cityCode,
        city: resolved.city,
        region: resolved.region,
        defaultLocation: resolved.defaultLocation,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve region'
    console.error('[cdek/widget][geo-region]', { message, error })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
