import { describe, expect, it } from 'vitest'
import type { ContentBlockResolved } from '@/services/content-block.service'
import { getAdminContentSchemaForBrandPage } from '@/config/content-blocks-defaults'
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

  it('does not render directions for unavailable categories without safe fallback content', () => {
    const result = resolveInnerHomeDirectionsContent(
      [
        shortBlock('home.directions.item1.categorySlug', 'foreign-or-unpublished'),
        shortBlock('home.directions.item1.isVisible', '1'),
      ],
      []
    )

    expect(result.items).toEqual([])
  })

  it('keeps custom content isolated from category fallback data', () => {
    const result = resolveInnerHomeDirectionsContent(
      [
        shortBlock('home.directions.item1.title', 'Свой заголовок'),
        shortBlock('home.directions.item1.description', 'Свое описание'),
        shortBlock('home.directions.item1.href', '/catalog/custom-direction'),
        shortBlock('home.directions.item1.isVisible', '1'),
      ],
      [
        {
          id: 'foreign',
          slug: 'sp-collagen',
          title: 'Sprint category',
          image: null,
          imageAlt: 'alt',
          catalogTeaser: 'teaser',
        },
      ]
    )

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      title: 'Свой заголовок',
      description: 'Свое описание',
      href: '/catalog/custom-direction',
      categorySlug: null,
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

  it('ignores unknown ids and blank chunks while preserving valid order', () => {
    const result = resolveInnerHomeSectionOrder([
      shortBlock('home.sections.order', ' ,unknown,reviews,,news,directions , bad '),
    ])

    expect(result).toEqual([
      'reviews',
      'news',
      'directions',
      'newArrivals',
      'howToOrder',
      'articles',
    ])
  })
})

describe('home content admin schema brand isolation', () => {
  it('exposes shared hero/directions controls for both brands but keeps section order inner-only', () => {
    const innerKeys = getAdminContentSchemaForBrandPage('inner', 'home').map((entry) => entry.key)
    const sprintKeys = getAdminContentSchemaForBrandPage('sprint-power', 'home').map(
      (entry) => entry.key
    )

    expect(innerKeys).toContain('home.sections.order')
    expect(innerKeys).toContain('home.directions.item1.categorySlug')
    expect(innerKeys).toContain('hero.image.src')
    // resolveInnerHomeHeroContent/resolveInnerHomeDirectionsContent рендерят
    // общий hero и directions-блок и для Sprint Power (см. SprintPowerHome в
    // src/app/(site)/page.tsx), поэтому эти ключи должны быть editable и там
    expect(sprintKeys).toContain('home.directions.item1.categorySlug')
    expect(sprintKeys).toContain('hero.image.src')
    // а вот порядок секций управляет только inner-версией главной
    expect(sprintKeys).not.toContain('home.sections.order')
  })
})
