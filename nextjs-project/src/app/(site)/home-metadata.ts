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
      'Inner Health: бульоны, коллаген и грибные комплексы. Документы на продукцию доступны в карточках товаров. Доставка по России.',
    alternates: { canonical: `${normalizedSiteUrl}/` },
    openGraph: {
      type: 'website',
      title: `${siteConfig.title} — нутриенты и здоровое питание`,
      description:
        'Бульоны, коллаген и грибные комплексы Inner Health. Документы на продукцию — в карточках товаров. Доставка по России.',
      url: `${normalizedSiteUrl}/`,
      images: [`${normalizedSiteUrl}/hero-portrait.png`],
    },
  }
}
