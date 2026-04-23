import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { resolveBrandByHost } from '@/lib/brand/brand'
import * as settingsService from '@/services/settings.service'
import { parseMetrikaSnippet } from '@/lib/analytics/metrika-snippet'

export async function GET(): Promise<NextResponse> {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
  const hostBrandId = resolveBrandByHost(host)

  const map = await settingsService.getSettingsMap(['yandexMetrikaHeadCode'], { brandId: hostBrandId })
  const raw = map.yandexMetrikaHeadCode ?? null
  const parsed = parseMetrikaSnippet(raw)

  return NextResponse.json(
    {
      host,
      hostBrandId,
      rawLen: raw ? raw.length : 0,
      rawPreview: raw ? raw.slice(0, 160) : null,
      parsed: parsed
        ? {
            scriptType: parsed.scriptType ?? null,
            scriptInnerLen: parsed.scriptInner.length,
            noscriptInnerLen: parsed.noscriptInner ? parsed.noscriptInner.length : 0,
          }
        : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

