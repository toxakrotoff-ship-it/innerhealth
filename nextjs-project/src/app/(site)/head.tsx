import * as settingsService from '@/services/settings.service'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { parseMetrikaSnippet } from '@/lib/analytics/metrika-snippet'

export default async function SiteHead() {
  const { brandId } = await getServerBrandContext()
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
