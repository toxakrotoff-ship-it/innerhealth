import { type ReactElement } from 'react'
import * as settingsService from '@/services/settings.service'

export default async function SiteHead(): Promise<ReactElement> {
  const map = await settingsService.getSettingsMap([
    'yandexMetrikaHeadCode',
  ])

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

