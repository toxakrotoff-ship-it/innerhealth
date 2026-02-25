import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Select only fields needed for admin list — do NOT fetch photos Json or long text. */
const adminListSelect = {
  id: true,
  tildaUid: true,
  slug: true,
  title: true,
  price: true,
  priceOld: true,
  photo: true,
  category: true,
  createdAt: true,
  categories: {
    select: {
      categoryId: true,
      category: { select: { id: true, title: true, slug: true } },
    },
  },
} as const;

/** Get product by id with categories (for admin edit form). */
export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { categories: true },
  });
}

/** Get all products with categories for admin list (no photos Json, no long text). */
export async function getProductsWithCategories() {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: adminListSelect,
  });
}

/** Fields for catalog/home product cards — include photos for blur placeholder. */
export const productCardSelect = {
  id: true,
  title: true,
  price: true,
  priceOld: true,
  photo: true,
  photos: true,
  slug: true,
  isPromoEligible: true,
  discountPrice: true,
} as const;

/** Get products for catalog page (paginated). Does not fetch photos Json. */
export async function getProductsForCatalog(skip: number, take: number) {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: productCardSelect,
  });
}

/** Get products for home "new products" block. Does not fetch photos Json. */
export async function getProductsForHome(take: number) {
  return prisma.product.findMany({
    where: { slug: { not: null } },
    orderBy: { createdAt: 'desc' },
    take,
    select: productCardSelect,
  });
}

/** Get products by ids with price/promo fields (for order creation). */
export async function getProductsForOrder(productIds: string[]) {
  return prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      price: true,
      priceOld: true,
      discountPrice: true,
      isPromoEligible: true,
    },
  });
}

/** Get products by ids with dimensions (for CDEK calculator). */
export async function getProductsForCdek(productIds: string[]) {
  return prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      weight: true,
      length: true,
      width: true,
      height: true,
    },
  });
}

/** Get minimal product fields for cart display (enrichment after rehydration). */
export async function getProductsForCart(productIds: string[]) {
  if (productIds.length === 0) return []
  return prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      title: true,
      price: true,
      priceOld: true,
      photo: true,
      slug: true,
      isPromoEligible: true,
      discountPrice: true,
    },
  });
}

/** Get all product ids and quantities (for stock endpoint). */
export async function getStockMap() {
  const rows = await prisma.product.findMany({
    select: { id: true, quantity: true },
  });
  const stock: Record<string, number | null> = {};
  for (const row of rows) {
    stock[row.id] = row.quantity;
  }
  return stock;
}

/** Get existing slugs for slugifyUnique. */
export async function getExistingProductSlugs() {
  const existing = await prisma.product.findMany({ select: { slug: true } });
  return existing.map((p) => p.slug).filter(Boolean) as string[];
}

export async function updateProduct(
  id: string,
  data: Prisma.ProductUpdateInput,
  categoryIds?: string[]
) {
  if (categoryIds !== undefined) {
    await prisma.productCategory.deleteMany({ where: { productId: id } });
    if (categoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
      });
    }
  }
  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function patchProductPriceQuantity(
  id: string,
  data: { price?: number; quantity?: number }
) {
  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function createProduct(
  data: Prisma.ProductCreateInput,
  categoryIds?: string[]
) {
  const newProduct = await prisma.product.create({ data });
  if (categoryIds?.length) {
    await prisma.productCategory.createMany({
      data: categoryIds.map((categoryId: string) => ({
        productId: newProduct.id,
        categoryId,
      })),
    });
  }
  return prisma.product.findUnique({
    where: { id: newProduct.id },
  });
}

export async function deleteProduct(id: string) {
  return prisma.product.delete({
    where: { id },
  });
}

export async function findProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
  });
}
