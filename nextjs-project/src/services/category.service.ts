import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import { isSprintPowerBrand, SPRINT_POWER_PRODUCT_BRAND } from '@/lib/brand/brand-scope'
import { productCardSelect } from '@/services/product.service'

const categoryOrderBy = [{ sortOrder: 'asc' as const }, { title: 'asc' as const }]

const publicCategoryTreeSelect = {
  id: true,
  title: true,
  slug: true,
  parentId: true,
  sortOrder: true,
} satisfies Prisma.CategorySelect

const publicCatalogCategorySelect = {
  id: true,
  brand: true,
  title: true,
  slug: true,
  image: true,
  imageAlt: true,
  catalogTeaser: true,
  sortOrder: true,
  _count: {
    select: {
      products: {
        where: { product: { isDraft: false } },
      },
    },
  },
} satisfies Prisma.CategorySelect

const publicCategoryMetadataSelect = {
  title: true,
  pageTitle: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  image: true,
  imageAlt: true,
  catalogTeaser: true,
  linePageBodyRichJson: true,
  showLegacyLinePageBlocks: true,
  isPublished: true,
  brand: true,
} satisfies Prisma.CategorySelect

const categoryListingProductSelect = Prisma.validator<Prisma.ProductSelect>()({
  ...productCardSelect,
  photos: true,
})

const publicCategoryPageBaseSelect = Prisma.validator<Prisma.CategorySelect>()({
  id: true,
  brand: true,
  title: true,
  pageTitle: true,
  slug: true,
  catalogTeaser: true,
  linePageBodyRichJson: true,
  showLegacyLinePageBlocks: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  image: true,
  imageAlt: true,
  isPublished: true,
  featuredProductId: true,
})

export type PublicCategoryMetadata = Prisma.CategoryGetPayload<{
  select: typeof publicCategoryMetadataSelect
}>

export type PublicCategoryPage = Prisma.CategoryGetPayload<{
  select: typeof publicCategoryPageBaseSelect
}> & {
  children: Array<{
    id: string
    title: string
    slug: string
    sortOrder: number | null
  }>
  products: Array<{
    sortOrder: number | null
    product: Prisma.ProductGetPayload<{ select: typeof categoryListingProductSelect }>
  }>
}

export type PublicCatalogCategory = Prisma.CategoryGetPayload<{
  select: typeof publicCatalogCategorySelect
}>

export type PublicCategoryTreeNode = Prisma.CategoryGetPayload<{
  select: typeof publicCategoryTreeSelect
}>

function buildPublicProductWhere(brandId: BrandId | null | undefined): Prisma.ProductWhereInput {
  if (isSprintPowerBrand(brandId)) {
    return {
      isDraft: false,
      brand: SPRINT_POWER_PRODUCT_BRAND,
    }
  }

  return {
    isDraft: false,
    OR: [{ brand: null }, { brand: { not: SPRINT_POWER_PRODUCT_BRAND } }],
  }
}

export async function getPublicCategoryMetadataBySlug(
  slug: string,
  brandId: BrandId | null = null
): Promise<PublicCategoryMetadata | null> {
  return prisma.category.findUnique({
    where: { brand_slug: { brand: resolveDbBrand(brandId), slug } },
    select: publicCategoryMetadataSelect,
  })
}

export async function getPublicCategoryBySlug(
  slug: string,
  brandId: BrandId | null = null
): Promise<PublicCategoryPage | null> {
  return prisma.category.findUnique({
    where: { brand_slug: { brand: resolveDbBrand(brandId), slug } },
    select: {
      ...publicCategoryPageBaseSelect,
      children: {
        where: { isPublished: true, brand: resolveDbBrand(brandId) },
        select: {
          id: true,
          title: true,
          slug: true,
          sortOrder: true,
        },
        orderBy: categoryOrderBy,
      },
      products: {
        where: { product: buildPublicProductWhere(brandId) },
        select: {
          sortOrder: true,
          product: {
            select: categoryListingProductSelect,
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { product: { title: 'asc' } }],
      },
    },
  })
}

export async function getPublishedCategoryTree(
  brandId: BrandId | null = null
): Promise<PublicCategoryTreeNode[]> {
  return prisma.category.findMany({
    where: { brand: resolveDbBrand(brandId), isPublished: true },
    select: publicCategoryTreeSelect,
    orderBy: categoryOrderBy,
  })
}

export async function getCatalogBlockCategories(
  brandId: BrandId | null = null
): Promise<PublicCatalogCategory[]> {
  return prisma.category.findMany({
    where: {
      brand: resolveDbBrand(brandId),
      isPublished: true,
      showInCategoriesBlock: true,
    },
    select: publicCatalogCategorySelect,
    orderBy: categoryOrderBy,
  })
}

/** Get all categories (for admin catalog). */
export async function getCategories(brandId: BrandId | null = null) {
  return prisma.category.findMany({
    where: { brand: resolveDbBrand(brandId), isPublished: true },
    orderBy: categoryOrderBy,
  })
}

/** Get categories with product count. */
export async function getCategoriesWithProductCount(brandId: BrandId | null = null) {
  const categories = await prisma.category.findMany({
    where: { brand: resolveDbBrand(brandId), isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      image: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          products: {
            where: { product: buildPublicProductWhere(brandId) },
          },
        },
      },
    },
    orderBy: categoryOrderBy,
  })
  return categories.map((c) => ({
    ...c,
    productCount: c._count.products,
  }))
}

/** Get product categories (for a product). */
export async function getProductCategories(productId: string) {
  const productCategories = await prisma.productCategory.findMany({
    where: { productId },
    include: { category: true },
    orderBy: { category: { title: 'asc' } },
  })
  return productCategories.map((pc) => pc.category)
}

/** Set product categories (replace all links). */
export async function setProductCategories(productId: string, categoryIds: string[]) {
  await prisma.productCategory.deleteMany({ where: { productId } })
  if (categoryIds.length > 0) {
    await prisma.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({ productId, categoryId })),
    })
  }
}

/** Find category by id. */
export async function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  })
}

/** Find category by slug. */
export async function findCategoryBySlug(slug: string, brandId: BrandId | null = null) {
  return prisma.category.findFirst({
    where: { slug, brand: resolveDbBrand(brandId), isPublished: true },
  })
}

/** Create category. */
export async function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({
    data,
  })
}

/** Update category. */
export async function updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
  return prisma.category.update({
    where: { id },
    data,
  })
}

/** Delete category (and product-category links). */
export async function deleteCategory(id: string) {
  await prisma.productCategory.deleteMany({ where: { categoryId: id } })
  return prisma.category.delete({ where: { id } })
}

/** Count products in category. */
export async function getCategoryProductCount(categoryId: string) {
  return prisma.productCategory.count({
    where: { categoryId },
  })
}

/** Suggest catalog categories for internal links in the news editor (admin). */
export async function suggestCategoriesForLink(
  query: string,
  limit: number,
  brandId: BrandId | null = null
) {
  const q = query.trim()
  const where =
    q.length === 0
      ? { brand: resolveDbBrand(brandId), isPublished: true }
      : {
          brand: resolveDbBrand(brandId),
          isPublished: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { slug: { contains: q, mode: 'insensitive' as const } },
          ],
        }

  const rows = await prisma.category.findMany({
    where,
    select: { id: true, title: true, slug: true },
    orderBy: categoryOrderBy,
    take: limit,
  })

  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    href: `/catalog/${c.slug}`,
  }))
}

/** Get products by category. */
export async function getProductsByCategory(categoryId: string) {
  const productCategories = await prisma.productCategory.findMany({
    where: { categoryId },
    include: { product: true },
  })
  return productCategories.map((pc) => pc.product)
}
