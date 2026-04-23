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
      <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <meta name="apple-mobile-web-app-title" content="Inner Health" />
      <link rel="manifest" href="/site.webmanifest" />
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
