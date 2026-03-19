import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Select only fields needed for admin list — do NOT fetch photos Json or long text. */
const adminListSelect = {
  id: true,
  tildaUid: true,
  slug: true,
  title: true,
  quantity: true,
  price: true,
  priceOld: true,
  photo: true,
  category: true,
  createdAt: true,
  isDraft: true,
  categories: {
    select: {
      categoryId: true,
      sortOrder: true,
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

/** Fields for catalog/home product cards — no photos JSON to reduce payload (use `photo` for image). */
export const productCardSelect = {
  id: true,
  title: true,
  brand: true,
  sku: true,
  price: true,
  priceOld: true,
  photo: true,
  slug: true,
  isPromoEligible: true,
  discountPrice: true,
} as const;

export interface CatalogQueryOptions {
  page: number;
  pageSize: number;
  q?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  promoOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
}

function buildCatalogOrderBy(sort: CatalogQueryOptions['sort']): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === 'price_asc') return [{ price: 'asc' }, { createdAt: 'desc' }];
  if (sort === 'price_desc') return [{ price: 'desc' }, { createdAt: 'desc' }];
  if (sort === 'name_asc') return [{ title: 'asc' }, { createdAt: 'desc' }];
  return [{ createdAt: 'desc' }];
}

function buildCatalogWhere(options: CatalogQueryOptions): Prisma.ProductWhereInput {
  const q = options.q?.trim();
  const where: Prisma.ProductWhereInput = {
    isDraft: false,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (options.brands && options.brands.length > 0) {
    where.brand = { in: options.brands };
  }

  if (options.minPrice != null || options.maxPrice != null) {
    where.price = {
      gte: options.minPrice ?? undefined,
      lte: options.maxPrice ?? undefined,
    };
  }

  if (options.promoOnly) {
    where.priceOld = { not: null };
  }

  return where;
}

export async function getCatalogProducts(options: CatalogQueryOptions) {
  const page = Math.max(1, options.page);
  const pageSize = Math.max(1, options.pageSize);
  const skip = (page - 1) * pageSize;
  const where = buildCatalogWhere(options);
  const orderBy = buildCatalogOrderBy(options.sort);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: productCardSelect,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    hasNextPage: skip + items.length < total,
  };
}

export async function getCatalogBrandOptions(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: {
      isDraft: false,
      brand: {
        not: null,
      },
    },
    select: {
      brand: true,
    },
    distinct: ['brand'],
    orderBy: [{ brand: 'asc' }],
  });

  return rows.map((row) => row.brand).filter((brand): brand is string => Boolean(brand?.trim()));
}

export async function suggestProducts(query: string, limit = 8) {
  const q = query.trim();
  if (!q) return [];

  return prisma.product.findMany({
    where: {
      isDraft: false,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }],
    take: Math.max(1, Math.min(limit, 10)),
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      price: true,
    },
  });
}

export async function getProductsForCompare(productIds: string[]) {
  if (productIds.length === 0) return [];
  return prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      photo: true,
      price: true,
      priceOld: true,
      brand: true,
      sku: true,
      characteristicsComposition: true,
      characteristicsNutrition100g: true,
      characteristicsEnergyValue100g: true,
      characteristicsShelfLife: true,
    },
  });
}

export async function getProductQuickViewSummary(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      slug: true,
      photo: true,
      price: true,
      priceOld: true,
      brand: true,
      sku: true,
      description: true,
      isPromoEligible: true,
      discountPrice: true,
    },
  });
}

/** Get products for catalog page (paginated). Does not fetch photos Json. */
export async function getProductsForCatalog(skip: number, take: number) {
  return prisma.product.findMany({
    where: { isDraft: false },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: productCardSelect,
  });
}

/** Get products for home "new products" block. Does not fetch photos Json. */
export async function getProductsForHome(take: number) {
  return prisma.product.findMany({
    where: { slug: { not: null }, isDraft: false },
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

/** Get related products by categories (MVP for PDP). */
export async function getRelatedProductsByCategory(
  productId: string,
  categoryIds: string[],
  take: number
) {
  if (categoryIds.length === 0) return []
  return prisma.product.findMany({
    where: {
      id: { not: productId },
      isDraft: false,
      categories: {
        some: {
          categoryId: { in: categoryIds },
        },
      },
    },
    take,
    orderBy: { createdAt: 'desc' },
    select: productCardSelect,
  })
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
        data: categoryIds.map((categoryId, index) => ({
          productId: id,
          categoryId,
          sortOrder: index,
        })),
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
  data: { price?: number; quantity?: number; isDraft?: boolean }
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
        sortOrder: 0,
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

interface ReorderItemInput {
  productId: string;
  sortOrder: number;
}

/** Обновить порядок товаров внутри одной категории. */
export async function reorderProductsInCategory(
  categoryId: string,
  items: ReorderItemInput[]
) {
  if (!items.length) return;

  await prisma.$transaction(
    items.map((item) =>
      prisma.productCategory.update({
        where: {
          productId_categoryId: {
            productId: item.productId,
            categoryId,
          },
        },
        data: {
          sortOrder: item.sortOrder,
        },
      })
    )
  );
}
