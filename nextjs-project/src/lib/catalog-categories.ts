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
  // Sprint Power — если в БД нет Category.image, те же пути, что и у блока каталога
  hydro: '/images/catalog/hydro-bento/01-taste.png',
  bonebroth: '/images/catalog/bonebroth-bento/01.png',
  'sp-bonebroth': '/images/catalog/bonebroth-bento/01.png',
  'sp-hydro': '/images/catalog/hydro-bento/01-taste.png',
  'sp-collagen': '/images/categories/collagen.png',
  /** Мультипротеин и др. линейки Sprint — если нет загрузки в админке */
  multi: '/images/catalog/collagen-bento/08-performance.png',
  'multi-protein': '/images/catalog/collagen-bento/08-performance.png',
  'sp-multi': '/images/catalog/collagen-bento/08-performance.png',
}

/** Если slug не попал в карту и в БД нет картинки — всё равно показать обложку на Sprint (как в каталоге). */
export const SPRINT_CATEGORY_FALLBACK_COVER = '/images/catalog/collagen-bento/08-performance.png'

function normalizeUploadedCategoryImage(raw: string | null | undefined): string | undefined {
  if (raw == null) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
}

/** Опечатки/альтернативные slug → ключ из {@link CATEGORY_BACKGROUND_IMAGES}. */
const CATEGORY_IMAGE_SLUG_ALIASES: Record<string, string> = {
  gidro: 'hydro',
  gydro: 'hydro',
  'hydro-protein': 'hydro',
  'gidro-protein': 'hydro',
}

/** Варианты slug для поиска файла в {@link CATEGORY_BACKGROUND_IMAGES} (регистр, префикс sp-, алиасы). */
function expandCategorySlugKeys(slug: string): readonly string[] {
  const s = slug.trim().toLowerCase()
  const keys: string[] = [s]
  if (s.startsWith('sp-')) keys.push(s.slice(3))
  const alias = CATEGORY_IMAGE_SLUG_ALIASES[s]
  if (alias) keys.push(alias)
  return [...new Set(keys)]
}

export function getCategoryBackgroundImage(slug: string): string | undefined {
  for (const key of expandCategorySlugKeys(slug)) {
    const img = CATEGORY_BACKGROUND_IMAGES[key]
    if (img) return img
  }
  return undefined
}

export interface ResolveCategoryImageOptions {
  /** Для Sprint: если и загрузка, и карта пусты — вернуть {@link SPRINT_CATEGORY_FALLBACK_COVER}. */
  readonly sprintFallback?: boolean
}

export function resolveCategoryImage(
  slug: string,
  uploadedImage?: string | null,
  options?: ResolveCategoryImageOptions
): string | undefined {
  const normalizedUpload = normalizeUploadedCategoryImage(uploadedImage)
  const local = getCategoryBackgroundImage(slug)
  const resolved = normalizedUpload ?? local
  if (options?.sprintFallback && !resolved) return SPRINT_CATEGORY_FALLBACK_COVER
  return resolved
}

/** Object position for category card background (so key elements like dropper tip are visible). */
export function getCategoryImageObjectPosition(slug: string): string {
  if (slug === 'nutrienty') return 'object-cover object-[50%_28%]'
  if (slug === 'hydro' || slug === 'sp-hydro') return 'object-cover object-[50%_45%]'
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
