import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import {
  isSprintPowerBrand,
  normalizeProductBrandForScope,
  productBelongsToBrandScope,
  SPRINT_POWER_PRODUCT_BRAND,
} from '@/lib/brand/brand-scope';

/** Select only fields needed for admin list — do NOT fetch photos Json or long text. */
const adminListSelect = {
  id: true,
  tildaUid: true,
  slug: true,
  title: true,
  brand: true,
  sku: true,
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
export async function getProductById(id: string, brandId?: BrandId | null) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!product) return null;
  if (!productBelongsToBrandScope(product.brand, brandId)) return null;
  return product;
}

/** Get all products with categories for admin list (no photos Json, no long text). */
export async function getProductsWithCategories(brandId?: BrandId | null) {
  const where: Prisma.ProductWhereInput | undefined = isSprintPowerBrand(brandId)
    ? { brand: SPRINT_POWER_PRODUCT_BRAND }
    : { OR: [{ brand: null }, { brand: { not: SPRINT_POWER_PRODUCT_BRAND } }] };
  return prisma.product.findMany({
    where,
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
  quantity: true,
  photo: true,
  slug: true,
  isPromoEligible: true,
  discountPrice: true,
  isPreorderEnabled: true,
  isFeaturedInNewArrivals: true,
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

/** Count products matching catalog filters (SEO robots / thin URLs without loading rows). */
export async function countCatalogProducts(
  options: Pick<CatalogQueryOptions, 'q' | 'brands' | 'minPrice' | 'maxPrice' | 'promoOnly'>
): Promise<number> {
  const where = buildCatalogWhere({
    page: 1,
    pageSize: 1,
    sort: 'newest',
    ...options,
  });
  return prisma.product.count({ where });
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

export async function suggestProducts(query: string, limit = 8, brandId?: BrandId | null) {
  const q = query.trim();
  if (!q) return [];

  const take = Math.max(1, Math.min(limit, 10));

  // Для "смежных" добавляем trigram match (`%`) и similarity-score.
  // Точные подстроки (`ILIKE '%q%'`) остаются и получают более высокий вес в сортировке.
  const brandFilterSql = isSprintPowerBrand(brandId)
    ? Prisma.sql`AND "brand" = ${SPRINT_POWER_PRODUCT_BRAND}`
    : Prisma.sql`AND ("brand" IS NULL OR "brand" <> ${SPRINT_POWER_PRODUCT_BRAND})`;

  return prisma.$queryRaw<
    Array<{ id: string; title: string; slug: string | null; sku: string | null; price: number }>
  >(
    Prisma.sql`
      SELECT
        "id",
        "title",
        "slug",
        "sku",
        "price"
      FROM "Product"
      WHERE "isDraft" = false
        ${brandFilterSql}
        AND (
          "title" ILIKE '%' || ${q} || '%'
          OR "sku" ILIKE '%' || ${q} || '%'
          OR "title" % ${q}
          OR "sku" % ${q}
        )
      ORDER BY
        (
          CASE WHEN "title" ILIKE '%' || ${q} || '%' THEN 100 ELSE 0 END
          + CASE WHEN "sku" ILIKE '%' || ${q} || '%' THEN 50 ELSE 0 END
          + GREATEST(
              COALESCE(similarity("title", ${q}), 0),
              COALESCE(similarity("sku", ${q}), 0)
            )
        ) DESC,
        "createdAt" DESC
      LIMIT ${take};
    `
  );
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
      quantity: true,
      isPreorderEnabled: true,
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
  const safeTake = Math.max(1, take);
  const featured = await prisma.product.findMany({
    where: {
      slug: { not: null },
      isDraft: false,
      isFeaturedInNewArrivals: true,
    },
    orderBy: { createdAt: 'desc' },
    take: safeTake,
    select: productCardSelect,
  });

  if (featured.length >= safeTake) return featured;

  const rest = await prisma.product.findMany({
    where: {
      slug: { not: null },
      isDraft: false,
      id: { notIn: featured.map((item) => item.id) },
    },
    orderBy: { createdAt: 'desc' },
    take: safeTake - featured.length,
    select: productCardSelect,
  });

  return [...featured, ...rest];
}

/** Get products by ids with price/promo fields (for order creation). */
export async function getProductsForOrder(productIds: string[], brandId?: BrandId | null) {
  const where: Prisma.ProductWhereInput = {
    id: { in: productIds },
    ...(isSprintPowerBrand(brandId)
      ? { brand: SPRINT_POWER_PRODUCT_BRAND }
      : { OR: [{ brand: null }, { brand: { not: SPRINT_POWER_PRODUCT_BRAND } }] }),
  };
  return prisma.product.findMany({
    where,
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
      quantity: true,
      isPreorderEnabled: true,
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
  categoryIds?: string[],
  brandId?: BrandId | null
) {
  const normalizedData: Prisma.ProductCreateInput = {
    ...data,
    brand: normalizeProductBrandForScope(
      typeof data.brand === 'string' ? data.brand : null,
      brandId
    ) ?? undefined,
  };
  const newProduct = await prisma.product.create({ data: normalizedData });
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

export interface ProductDeleteDependencyStats {
  productCategories: number
  cartItems: number
  orderItems: number
  quickOrders: number
  giftPromotions: number
}

export async function getProductDeleteDependencyStats(
  productId: string
): Promise<ProductDeleteDependencyStats> {
  const [productCategories, cartItems, orderItems, quickOrders, giftPromotions] = await Promise.all([
    prisma.productCategory.count({ where: { productId } }),
    prisma.cartItem.count({ where: { productId } }),
    prisma.orderItem.count({ where: { productId } }),
    prisma.quickOrder.count({ where: { productId } }),
    prisma.giftPromotion.count({ where: { giftProductId: productId } }),
  ])

  return {
    productCategories,
    cartItems,
    orderItems,
    quickOrders,
    giftPromotions,
  }
}

export async function findProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
  });
}

export async function findProductByIdInBrandScope(id: string, brandId?: BrandId | null) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return null;
  return productBelongsToBrandScope(product.brand, brandId) ? product : null;
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
