/**
 * Slugs of categories shown in the main catalog block (with background images).
 * Other categories (e.g. Подарочные сертификаты, Новинки) are displayed elsewhere.
 */
export const CATALOG_BLOCK_SLUGS = [
  'collagen',
  'gribnaya-kollekciya',
  'nutrienty',
  'bulony',
  'podarkovye-nabory',
  'aktsii',
] as const

export type CatalogBlockSlug = (typeof CATALOG_BLOCK_SLUGS)[number]

/** Local background image path for each category slug in the main catalog block */
export const CATEGORY_BACKGROUND_IMAGES: Record<CatalogBlockSlug, string> = {
  collagen: '/images/categories/collagen.png',
  'gribnaya-kollekciya': '/images/categories/gribnaya-kollekciya.png',
  nutrienty: '/images/categories/nutrienty.jpg',
  bulony: '/images/categories/bulony.png',
  aktsii: '/images/categories/aktsii.png',
  'podarkovye-nabory': '/images/categories/podarkovye-nabory.jpg',
}

export function isCatalogBlockSlug(slug: string): slug is CatalogBlockSlug {
  return CATALOG_BLOCK_SLUGS.includes(slug as CatalogBlockSlug)
}

export function getCategoryBackgroundImage(slug: string): string | undefined {
  return isCatalogBlockSlug(slug) ? CATEGORY_BACKGROUND_IMAGES[slug] : undefined
}

const SLUG_SET = new Set<string>(CATALOG_BLOCK_SLUGS)

/** Filter categories to only those shown in the main catalog block */
export function filterCatalogBlockCategories<T extends { slug: string }>(
  categories: T[]
): T[] {
  return categories.filter((cat) => SLUG_SET.has(cat.slug))
}
