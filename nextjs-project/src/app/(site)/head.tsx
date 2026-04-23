import * as settingsService from '@/services/settings.service'
import { headers } from 'next/headers'
import { resolveBrandByHost } from '@/lib/brand/brand'
import { parseMetrikaSnippet } from '@/lib/analytics/metrika-snippet'

export default async function SiteHead() {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
  // Important: resolve by host only (ignore cookies) so each domain gets its own counter.
  const brandId = resolveBrandByHost(host)
  const map = await settingsService.getSettingsMap([
    'yandexMetrikaHeadCode',
  ], { brandId })

  const headCode = map.yandexMetrikaHeadCode
  const parsed = headCode ? parseMetrikaSnippet(headCode) : null

  return (
    <>
      {parsed ? (
        <script
          type={parsed.scriptType}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: parsed.scriptInner }}
        />
      ) : null}
      {parsed?.noscriptInner ? (
        <noscript
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: parsed.noscriptInner }}
        />
      ) : null}
    </>
  )
}
