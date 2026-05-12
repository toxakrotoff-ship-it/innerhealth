import { describe, expect, it } from 'vitest'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { buildHomeMetadata } from './home-metadata'

describe('buildHomeMetadata', () => {
  it('adds required Open Graph fields for the Inner homepage', () => {
    const metadata = buildHomeMetadata({
      activeBrand: 'inner',
      siteConfig: getBrandSiteConfig('inner'),
      siteUrl: 'https://innerhealth.ru/',
    })

    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: 'https://innerhealth.ru/',
      images: ['https://innerhealth.ru/hero-portrait.png'],
    })
  })
})
