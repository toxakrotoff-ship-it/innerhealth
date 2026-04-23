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
      <link
        rel="icon"
        href="/favicon-on-black.svg"
        type="image/svg+xml"
        media="(prefers-color-scheme: light)"
      />
      <link
        rel="icon"
        href="/favicon-on-white.svg"
        type="image/svg+xml"
        media="(prefers-color-scheme: dark)"
      />
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
