import { type ReactElement } from 'react'
import * as settingsService from '@/services/settings.service'
import { getServerBrandContext } from '@/lib/brand/brand-server'

function extractInlineScript(code: string): string {
  const trimmed = code.trim()
  if (!trimmed.toLowerCase().includes('<script')) return trimmed

  const firstScriptMatch = trimmed.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)
  if (!firstScriptMatch?.[1]) return trimmed
  return firstScriptMatch[1].trim()
}

export default async function SiteHead(): Promise<ReactElement> {
  const { brandId } = await getServerBrandContext()
  const map = await settingsService.getSettingsMap([
    'yandexMetrikaHeadCode',
  ], { brandId })

  const headCode = map.yandexMetrikaHeadCode
  const inlineScript = headCode ? extractInlineScript(headCode) : null

  return (
    <>
      {inlineScript ? (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: inlineScript }}
        />
      ) : null}
    </>
  )
}
