import { describe, expect, it } from 'vitest'
import type { ContentBlockResolved } from '@/services/content-block.service'
import {
  resolveInnerHomeDirectionsContent,
  resolveInnerHomeHeroContent,
  resolveInnerHomeSectionOrder,
} from './home-page-content'

function shortBlock(key: string, text: string | null): ContentBlockResolved {
  return {
    key,
    label: key,
    type: 'short',
    text,
    richJson: null,
    colorToken: null,
    fontVariant: null,
    fontWeight: null,
  }
}

describe('resolveInnerHomeHeroContent', () => {
  it('uses visibility flags and custom CTA/image values', () => {
    const result = resolveInnerHomeHeroContent([
      shortBlock('hero.isVisible', '1'),
      shortBlock('hero.badge.isVisible', '0'),
      shortBlock('hero.cta.isVisible', 'да'),
      shortBlock('hero.image.isVisible', 'true'),
      shortBlock('hero.cta.label', 'В каталог'),
      shortBlock('hero.cta.href', '/catalog'),
      shortBlock('hero.image.src', 'images/hero.png'),
      shortBlock('hero.image.alt', 'Hero alt'),
    ])

    expect(result.showBadge).toBe(false)
    expect(result.showPrimaryCta).toBe(true)
    expect(result.imageSrc).toBe('/images/hero.png')
    expect(result.imageAlt).toBe('Hero alt')
  })
})

describe('resolveInnerHomeDirectionsContent', () => {
  it('merges category fallbacks with block overrides and sorts visible items', () => {
    const result = resolveInnerHomeDirectionsContent(
      [
        shortBlock('home.directions.item1.categorySlug', 'bulony'),
        shortBlock('home.directions.item1.sortOrder', '2'),
        shortBlock('home.directions.item2.title', 'Своя карточка'),
        shortBlock('home.directions.item2.description', 'Описание'),
        shortBlock('home.directions.item2.href', '/catalog/custom'),
        shortBlock('home.directions.item2.sortOrder', '1'),
        shortBlock('home.directions.item3.title', 'Скрытая карточка'),
        shortBlock('home.directions.item3.isVisible', '0'),
      ],
      [
        {
          id: '1',
          slug: 'bulony',
          title: 'Бульоны',
          image: null,
          imageAlt: 'alt',
          catalogTeaser: 'тизер',
        },
      ]
    )

    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      title: 'Своя карточка',
      href: '/catalog/custom',
    })
    expect(result.items[1]).toMatchObject({
      title: 'Бульоны',
      description: 'тизер',
      href: '/catalog/bulony',
      categorySlug: 'bulony',
    })
  })
})

describe('resolveInnerHomeSectionOrder', () => {
  it('deduplicates configured section ids and appends missing defaults', () => {
    const result = resolveInnerHomeSectionOrder([
      shortBlock('home.sections.order', 'reviews,directions,reviews,news'),
    ])

    expect(result).toEqual([
      'reviews',
      'directions',
      'news',
      'newArrivals',
      'howToOrder',
      'articles',
    ])
  })
})
