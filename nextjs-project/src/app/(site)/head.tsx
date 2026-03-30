import { type ReactElement } from 'react'
import * as settingsService from '@/services/settings.service'
import { getServerBrandContext } from '@/lib/brand/brand-server'

export default async function SiteHead(): Promise<ReactElement> {
  const { brandId } = await getServerBrandContext()
  const map = await settingsService.getSettingsMap([
    'yandexMetrikaHeadCode',
  ], { brandId })

  const headCode = map.yandexMetrikaHeadCode

  return (
    <>
      {headCode ? (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: headCode }}
        />
      ) : null}
    </>
  )
}
