import type { Metadata } from 'next'
import type { BrandId } from '@/lib/brand/brand'
import type { BrandSiteConfig } from '@/lib/brand/site-branding'

interface BuildHomeMetadataParams {
  activeBrand: BrandId
  siteConfig: BrandSiteConfig
  siteUrl: string
}

export function buildHomeMetadata({
  activeBrand,
  siteConfig,
  siteUrl,
}: BuildHomeMetadataParams): Metadata {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, '')

  if (activeBrand === 'sprint-power') {
    return {
      title: 'Главная',
      description:
        'Sprint Power: спортивное питание и нутриенты для силы, восстановления и результата.',
      alternates: { canonical: `${normalizedSiteUrl}/` },
      openGraph: {
        type: 'website',
        title: 'Sprint Power — спортивное питание',
        description:
          'Линейка спортивного питания Sprint Power: протеин, восстановление, продукты для активной формы.',
        url: `${normalizedSiteUrl}/`,
        images: [`${normalizedSiteUrl}/sprint-power-mockup.png`],
      },
    }
  }

  return {
    title: 'Главная',
    description:
      'Inner Health: нутриенты, коллаген, грибные комплексы и здоровое питание. Акции, доставка по России, сертифицированная продукция.',
    alternates: { canonical: `${normalizedSiteUrl}/` },
    openGraph: {
      type: 'website',
      title: `${siteConfig.title} — нутриенты и здоровое питание`,
      description:
        'Интернет-магазин нутриентов и продуктов для здоровья: каталог, новости и выгодные предложения.',
      url: `${normalizedSiteUrl}/`,
      images: [`${normalizedSiteUrl}/hero-portrait.png`],
    },
  }
}
