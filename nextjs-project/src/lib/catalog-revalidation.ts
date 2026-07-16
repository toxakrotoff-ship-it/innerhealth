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

export function buildProductRevalidationPaths(product: {
  id: string
  slug: string | null
}): string[] {
  const paths = [`/product/id/${product.id}`]

  if (product.slug?.trim()) {
    paths.push(`/product/${product.slug.trim()}`)
  }

  return paths
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
  const [linkedCategories, product] = await Promise.all([
    prisma.productCategory.findMany({
      where: { productId: options.productId },
      select: { categoryId: true },
    }),
    prisma.product.findUnique({
      where: { id: options.productId },
      select: { id: true, slug: true },
    }),
  ])

  const categoryIds = Array.from(
    new Set([
      ...linkedCategories.map((item) => item.categoryId),
      ...(options.extraCategoryIds ?? []),
    ])
  )

  if (product) {
    revalidateStorefrontPaths(buildProductRevalidationPaths(product))
  }

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
