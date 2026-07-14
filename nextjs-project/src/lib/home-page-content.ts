import type { ContentBlockResolved } from '@/services/content-block.service'
import { resolveCategoryImage } from '@/lib/catalog-categories'

interface HomeCategoryLike {
  id: string
  title: string
  slug: string
  image: string | null
  imageAlt?: string | null
  catalogTeaser?: string | null
}

export interface InnerHomeHeroContent {
  isVisible: boolean
  badgeText: string
  titleText: string
  subtitleText: string
  descriptionText: string
  highlightWord: string
  ctaLabel: string
  ctaHref: string
  imageSrc: string | null
  imageAlt: string
  showBadge: boolean
  showSubtitle: boolean
  showDescription: boolean
  showPrimaryCta: boolean
  showImage: boolean
}

export interface InnerHomeDirectionItem {
  id: string
  title: string
  description: string
  href: string
  imageSrc: string | null
  imageAlt: string
  categorySlug: string | null
  sortOrder: number
  isVisible: boolean
}

export interface InnerHomeDirectionsContent {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  items: InnerHomeDirectionItem[]
}

export const INNER_HOME_SECTION_IDS = [
  'directions',
  'newArrivals',
  'howToOrder',
  'news',
  'articles',
  'reviews',
] as const

export type InnerHomeSectionId = (typeof INNER_HOME_SECTION_IDS)[number]

function getBlock(blocks: ContentBlockResolved[], key: string): ContentBlockResolved | null {
  return blocks.find((block) => block.key === key) ?? null
}

function getText(blocks: ContentBlockResolved[], key: string, fallback = ''): string {
  const text = getBlock(blocks, key)?.text?.trim()
  return text && text.length > 0 ? text : fallback
}

function getBoolean(blocks: ContentBlockResolved[], key: string, fallback: boolean): boolean {
  const raw = getBlock(blocks, key)?.text
  if (raw == null) return fallback
  const value = raw.trim().toLowerCase()
  if (value.length === 0) return fallback
  return value === '1' || value === 'true' || value === 'yes' || value === 'y' || value === 'on' || value === 'да'
}

function getSortOrder(blocks: ContentBlockResolved[], key: string, fallback: number): number {
  const raw = getBlock(blocks, key)?.text?.trim()
  if (!raw) return fallback
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : fallback
}

function normalizeImageSrc(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
}

export function resolveInnerHomeHeroContent(blocks: ContentBlockResolved[]): InnerHomeHeroContent {
  return {
    isVisible: getBoolean(blocks, 'hero.isVisible', true),
    badgeText: getText(blocks, 'hero.badge', 'INNER HEALTH'),
    titleText: getText(blocks, 'hero.title', 'Функциональное питание\nдля ежедневного\nрациона'),
    subtitleText: getText(
      blocks,
      'hero.subtitle',
      'Натуральные сухие бульоны, пептиды коллагена и продукты из функциональных грибов российского производства.'
    ),
    descriptionText: getText(
      blocks,
      'hero.description',
      'Понятные составы, удобные форматы и подробная информация о каждом продукте.'
    ),
    highlightWord: getText(blocks, 'hero.title.highlight', ''),
    ctaLabel: getText(blocks, 'hero.cta.label', 'ПЕРЕЙТИ В КАТАЛОГ'),
    ctaHref: getText(blocks, 'hero.cta.href', '/catalog'),
    imageSrc: normalizeImageSrc(getText(blocks, 'hero.image.src', '/hero-portrait.png')),
    imageAlt: getText(
      blocks,
      'hero.image.alt',
      'Иллюстрация Inner Health с фирменным героем и упаковками функционального питания.'
    ),
    showBadge: getBoolean(blocks, 'hero.badge.isVisible', true),
    showSubtitle: getBoolean(blocks, 'hero.subtitle.isVisible', true),
    showDescription: getBoolean(blocks, 'hero.description.isVisible', true),
    showPrimaryCta: getBoolean(blocks, 'hero.cta.isVisible', true),
    showImage: getBoolean(blocks, 'hero.image.isVisible', true),
  }
}

export function resolveInnerHomeDirectionsContent(
  blocks: ContentBlockResolved[],
  categories: HomeCategoryLike[]
): InnerHomeDirectionsContent {
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]))
  const items = [1, 2, 3]
    .map((index): InnerHomeDirectionItem => {
      const prefix = `home.directions.item${index}`
      const categorySlug = getText(blocks, `${prefix}.categorySlug`, '') || null
      const category = categorySlug ? categoriesBySlug.get(categorySlug) ?? null : null
      const imageSrc =
        normalizeImageSrc(getText(blocks, `${prefix}.image.src`, '')) ??
        (category ? resolveCategoryImage(category.slug, category.image) ?? null : null)
      const title = getText(blocks, `${prefix}.title`, category?.title ?? '')
      const href = getText(
        blocks,
        `${prefix}.href`,
        category ? `/catalog/${category.slug}` : '/catalog'
      )
      const imageAlt = getText(
        blocks,
        `${prefix}.image.alt`,
        category?.imageAlt ?? (title ? `${title} Inner Health.` : 'Товарное направление Inner Health.')
      )

      return {
        id: `item${index}`,
        title,
        description: getText(blocks, `${prefix}.description`, category?.catalogTeaser ?? ''),
        href,
        imageSrc,
        imageAlt,
        categorySlug,
        sortOrder: getSortOrder(blocks, `${prefix}.sortOrder`, index),
        isVisible: getBoolean(blocks, `${prefix}.isVisible`, true),
      }
    })
    .filter((item) => item.isVisible && item.title.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return {
    title: getText(blocks, 'home.directions.title', 'Товарные направления'),
    subtitle: getText(
      blocks,
      'home.directions.subtitle',
      'Три ключевых направления ассортимента Inner Health, доступные уже сейчас.'
    ),
    ctaLabel: getText(blocks, 'home.directions.cta.label', 'СМОТРЕТЬ ВЕСЬ КАТАЛОГ'),
    ctaHref: getText(blocks, 'home.directions.cta.href', '/catalog'),
    items,
  }
}

export function resolveInnerHomeSectionOrder(blocks: ContentBlockResolved[]): InnerHomeSectionId[] {
  const raw = getText(
    blocks,
    'home.sections.order',
    INNER_HOME_SECTION_IDS.join(',')
  )
  const seen = new Set<string>()
  const ordered = raw
    .split(',')
    .map((chunk) => chunk.trim())
    .filter((value): value is InnerHomeSectionId =>
      INNER_HOME_SECTION_IDS.includes(value as InnerHomeSectionId)
    )
    .filter((value) => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })

  for (const sectionId of INNER_HOME_SECTION_IDS) {
    if (!seen.has(sectionId)) ordered.push(sectionId)
  }

  return ordered
}
