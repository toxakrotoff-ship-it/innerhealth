import { prisma } from '@/lib/prisma'
import { revalidateStorefrontPaths } from '@/lib/site-revalidation'

export function buildCatalogRevalidationPaths(categorySlugs: readonly string[]): string[] {
  const basePaths = ['/', '/catalog']
  const normalizedCategoryPaths = Array.from(
    new Set(
      categorySlugs
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0)
        .map((slug) => `/catalog/${slug}`)
    )
  )

  return [...basePaths, ...normalizedCategoryPaths]
}

export function revalidateCategoryStorefront(categorySlugs: readonly string[]): void {
  revalidateStorefrontPaths(buildCatalogRevalidationPaths(categorySlugs))
}

/**
 * Revalidates the home page, catalog list, and category pages affected by a product.
 * Pass `extraCategoryIds` when categories were removed or reassigned so old category pages update too.
 */
export async function revalidateCatalogForProduct(options: {
  productId: string
  extraCategoryIds?: readonly string[]
}): Promise<void> {
  const linkedCategories = await prisma.productCategory.findMany({
    where: { productId: options.productId },
    select: { categoryId: true },
  })

  const categoryIds = Array.from(
    new Set([
      ...linkedCategories.map((item) => item.categoryId),
      ...(options.extraCategoryIds ?? []),
    ])
  )

  if (categoryIds.length === 0) {
    revalidateCategoryStorefront([])
    return
  }

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { slug: true },
  })

  revalidateCategoryStorefront(categories.map((category) => category.slug))
}
