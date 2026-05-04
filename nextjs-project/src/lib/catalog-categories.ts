import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import {
  isSprintPowerBrand,
  SPRINT_POWER_CATEGORY_SLUG_PREFIX,
} from '@/lib/brand/brand-scope'

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

export interface FilterCatalogBlockCategoriesOptions {
  /** Storefront brand: Inner keeps only `brand === "inner"` (and slug fallback); Sprint allows sprint rows and legacy `inner` + `sp-*`. */
  brandId?: BrandId | null
}

/**
 * Filter categories for the main catalog block. Prefer DB `brand` when present — slug `sp-*`
 * alone is not enough because Sprint rows may use non-prefixed slugs.
 */
export function filterCatalogBlockCategories<T extends { slug: string; brand?: string }>(
  categories: T[],
  options?: FilterCatalogBlockCategoriesOptions
): T[] {
  if (options?.brandId == null) return categories

  if (!isSprintPowerBrand(options.brandId)) {
    const dbBrand = resolveDbBrand(options.brandId)
    return categories.filter((c) => {
      if (c.brand != null && c.brand !== '') return c.brand === dbBrand
      return !c.slug.startsWith(SPRINT_POWER_CATEGORY_SLUG_PREFIX)
    })
  }

  return categories.filter((c) => {
    if (c.brand === 'sprint-power') return true
    if (c.brand === 'inner' && c.slug.startsWith(SPRINT_POWER_CATEGORY_SLUG_PREFIX)) return true
    if (c.brand != null && c.brand !== '') return false
    return true
  })
}
