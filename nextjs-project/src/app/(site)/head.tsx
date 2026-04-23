import { type ReactElement } from 'react'
import * as settingsService from '@/services/settings.service'
import { getServerBrandContext } from '@/lib/brand/brand-server'

function extractInlineScript(code: string): string {
  const trimmed = code.trim()
  if (!trimmed.toLowerCase().includes('<script')) return trimmed

  const openTagEnd = trimmed.indexOf('>')
  const closeTagStart = trimmed.toLowerCase().lastIndexOf('</script')
  if (openTagEnd < 0 || closeTagStart < 0 || closeTagStart <= openTagEnd) return trimmed

  return trimmed.slice(openTagEnd + 1, closeTagStart).trim()
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
