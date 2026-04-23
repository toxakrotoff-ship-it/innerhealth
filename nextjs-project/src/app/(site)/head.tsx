import { type ReactElement } from 'react'
import * as settingsService from '@/services/settings.service'
import { getServerBrandContext } from '@/lib/brand/brand-server'

interface ParsedMetrikaSnippet {
  scriptType: string | undefined
  scriptInner: string
  noscriptInner: string | null
}

function parseMetrikaSnippet(code: string): ParsedMetrikaSnippet | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  const scriptMatch = trimmed.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/i)
  const scriptInner = scriptMatch?.[2]?.trim()
  if (!scriptInner) return null

  const attrs = scriptMatch?.[1] ?? ''
  const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)
  const scriptType = typeMatch?.[1]?.trim()

  const noscriptMatch = trimmed.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/i)
  const noscriptInner = noscriptMatch?.[1]?.trim() ? noscriptMatch[1].trim() : null

  return { scriptType, scriptInner, noscriptInner }
}

export default async function SiteHead(): Promise<ReactElement> {
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
