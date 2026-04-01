/** Local background image path for each category slug in the main catalog block */
export const CATEGORY_BACKGROUND_IMAGES: Record<string, string> = {
  collagen: '/images/categories/collagen.png',
  'gribnaya-kollekciya': '/images/categories/gribnaya-kollekciya.png',
  nutrienty: '/images/categories/nutrienty.png',
  bulony: '/images/categories/bulony.png',
  aktsii: '/images/categories/aktsii.png',
  'podarkovye-nabory': '/images/categories/podarkovye-nabory.jpg',
}

export function getCategoryBackgroundImage(slug: string): string | undefined {
  return CATEGORY_BACKGROUND_IMAGES[slug]
}

export function resolveCategoryImage(
  slug: string,
  uploadedImage?: string | null
): string | undefined {
  return uploadedImage || getCategoryBackgroundImage(slug)
}

/** Object position for category card background (so key elements like dropper tip are visible). */
export function getCategoryImageObjectPosition(slug: string): string {
  if (slug === 'nutrienty') return 'object-cover object-[50%_28%]'
  return 'object-cover object-center'
}

/** Filter categories to only those shown in the main catalog block.
 * Сейчас возвращает все категории без фильтрации, чтобы новые категории
 * и изменения slug сразу появлялись на главной без пересборки.
 */
export function filterCatalogBlockCategories<T extends { slug: string }>(
  categories: T[]
): T[] {
  return categories
}
