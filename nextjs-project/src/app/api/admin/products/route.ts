import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { revalidateCatalogForProduct } from '@/lib/catalog-revalidation';
import { slugify, slugifyUnique } from '@/lib/slugify';
import { sanitizeProductTextFields } from '@/lib/sanitize-text';
import * as productService from '@/services/product.service';
import { resolveBrandFromRequest } from '@/lib/brand/brand-request';

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    try {
      const product = await productService.getProductById(id, brandId);
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product' },
        { status: 500 }
      );
    }
  }

  try {
    const products = await productService.getProductsWithCategories(brandId);
    if (!Array.isArray(products)) {
      console.error('API Error: Expected array but got:', typeof products);
      return NextResponse.json(
        { error: 'Invalid data format returned from database' },
        { status: 500 }
      );
    }
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

const allowedBrandSchema = z.enum(['inner', 'sprint-power']);

const putProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  categoryIds: z.array(z.string()).optional(),
  brand: allowedBrandSchema.optional(),
  parentUid: z.string().trim().min(1).nullable().optional(),
}).passthrough();

export async function PUT(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  let parsed: z.infer<typeof putProductSchema>;
  try {
    const raw = await request.json();
    parsed = putProductSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id, categoryIds, ...data } = parsed;

  try {

    const existingProduct = await productService.findProductByIdInBrandScope(id, brandId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const previousCategoryIds =
      categoryIds !== undefined
        ? (
            await prisma.productCategory.findMany({
              where: { productId: id },
              select: { categoryId: true },
            })
          ).map((row) => row.categoryId)
        : [];

    const productFields = ['tildaUid', 'slug', 'brand', 'sku', 'mark', 'category', 'title', 'description', 'text', 'photo', 'photos', 'price', 'quantity', 'priceOld', 'discountPrice', 'isPromoEligible', 'isPreorderEnabled', 'isFeaturedInNewArrivals', 'isDraft', 'editions', 'modifications', 'externalId', 'parentUid', 'weight', 'length', 'width', 'height', 'seoTitle', 'seoDescr', 'seoKeywords', 'fbTitle', 'fbDescr', 'tab1', 'tab2', 'tab3', 'tab4', 'tab1Title', 'tab2Title', 'tab3Title', 'tab4Title'] as const;
    const characteristics = ['characteristicsNutrition100g', 'characteristicsKkal', 'characteristicsContraindications', 'characteristicsShelfLife', 'characteristicsShelfLife2', 'characteristicsNutrition100gProduct', 'characteristicsEnergyValue100g', 'characteristicsNutrition100g2', 'characteristicsNutritionPerPortion5g', 'characteristicsComposition', 'characteristicsKkal100gDailyDose', 'characteristicsFormulation', 'characteristicsCalorie', 'characteristicsFlacon200ml', 'characteristicsStorage'];
    const allFields = [...productFields, ...characteristics];
    const sanitizedData: Record<string, unknown> = {};
    for (const key of allFields) {
      if (key in data && data[key] !== undefined) sanitizedData[key] = data[key];
    }
    if (Array.isArray(sanitizedData.photos) && sanitizedData.photos.length > 0) {
      const urls = sanitizedData.photos.filter((u: unknown) => typeof u === 'string') as string[];
      sanitizedData.photo = urls[0] ?? null;
      const existingPhotos = Array.isArray(existingProduct.photos) ? existingProduct.photos as Array<{ url?: string; blurDataURL?: string } | string> : [];
      const blurByUrl: Record<string, string> = {};
      for (const p of existingPhotos) {
        const url = typeof p === 'string' ? p : p?.url;
        const blur = typeof p === 'object' && p && 'blurDataURL' in p && typeof (p as { blurDataURL?: string }).blurDataURL === 'string' ? (p as { blurDataURL: string }).blurDataURL : undefined;
        if (url && blur) blurByUrl[url] = blur;
      }
      sanitizedData.photos = urls.map((url) => (blurByUrl[url] ? { url, blurDataURL: blurByUrl[url] } : { url })) as unknown;
    }
    Object.assign(sanitizedData, sanitizeProductTextFields(sanitizedData));

    const updatedProduct = await productService.updateProduct(
      id,
      sanitizedData as Prisma.ProductUpdateInput,
      categoryIds
    );
    await revalidateCatalogForProduct({
      productId: id,
      extraCategoryIds:
        categoryIds !== undefined
          ? [...previousCategoryIds, ...categoryIds]
          : undefined,
    });
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    const message = error instanceof Error ? error.message : String(error);
    const isUnknownColumn = /column.*does not exist|Unknown column/i.test(message);
    return NextResponse.json(
      {
        error: isUnknownColumn
          ? 'В БД нет полей для названий табов. Выполните миграцию: npx prisma migrate deploy'
          : 'Не удалось обновить товар',
        detail: message,
      },
      { status: 500 }
    );
  }
}

const patchProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  price: z.number().min(0).optional(),
  quantity: z.number().int().min(0).optional(),
  isDraft: z.boolean().optional(),
}).refine((d) => d.price !== undefined || d.quantity !== undefined || d.isDraft !== undefined, { message: 'Provide at least one of price, quantity, isDraft' });

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  let parsed: z.infer<typeof patchProductSchema>;
  try {
    const raw = await request.json();
    parsed = patchProductSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id, price, quantity, isDraft } = parsed;

  try {

    const data: { price?: number; quantity?: number; isDraft?: boolean } = {};
    if (price !== undefined) data.price = price;
    if (quantity !== undefined) data.quantity = quantity;
    if (isDraft !== undefined) data.isDraft = isDraft;

    const existingProduct = await productService.findProductByIdInBrandScope(id, brandId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    const updated = await productService.patchProductPriceQuantity(id, data);
    await revalidateCatalogForProduct({ productId: id });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH product error:', error);
    return NextResponse.json(
      { error: error && typeof (error as { code?: string }).code === 'string' && (error as { code: string }).code === 'P2025' ? 'Product not found' : 'Failed to update product' },
      { status: 500 }
    );
  }
}

const postProductSchema = z.object({
  categoryIds: z.array(z.string()).optional(),
  brand: allowedBrandSchema.optional(),
  parentUid: z.string().trim().min(1).nullable().optional(),
}).passthrough();

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  let parsed: z.infer<typeof postProductSchema>;
  try {
    const raw = await request.json();
    parsed = postProductSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { categoryIds, ...data } = parsed as { categoryIds?: string[] } & Record<string, unknown>;

  try {
    let slug = typeof data.slug === 'string' ? data.slug.trim() || null : null;
    const titleStr = typeof data.title === 'string' ? data.title : undefined;
    if (!slug && titleStr) {
      const baseSlug = slugify(titleStr);
      const existingSlugs = await productService.getExistingProductSlugs();
      slug = slugifyUnique(baseSlug, existingSlugs);
    }
    const productFields = ['tildaUid', 'slug', 'brand', 'sku', 'mark', 'category', 'title', 'description', 'text', 'photo', 'photos', 'price', 'quantity', 'priceOld', 'discountPrice', 'isPromoEligible', 'isPreorderEnabled', 'isFeaturedInNewArrivals', 'isDraft', 'editions', 'modifications', 'externalId', 'parentUid', 'weight', 'length', 'width', 'height', 'seoTitle', 'seoDescr', 'seoKeywords', 'fbTitle', 'fbDescr', 'tab1', 'tab2', 'tab3', 'tab4', 'tab1Title', 'tab2Title', 'tab3Title', 'tab4Title'] as const;
    const characteristics = ['characteristicsNutrition100g', 'characteristicsKkal', 'characteristicsContraindications', 'characteristicsShelfLife', 'characteristicsShelfLife2', 'characteristicsNutrition100gProduct', 'characteristicsEnergyValue100g', 'characteristicsNutrition100g2', 'characteristicsNutritionPerPortion5g', 'characteristicsComposition', 'characteristicsKkal100gDailyDose', 'characteristicsFormulation', 'characteristicsCalorie', 'characteristicsFlacon200ml', 'characteristicsStorage'];
    const allFields = [...productFields, ...characteristics];
    const sanitizedCreate: Record<string, unknown> = { slug: slug || undefined };
    for (const key of allFields) {
      if (key in data && data[key] !== undefined) sanitizedCreate[key] = data[key];
    }
    if (Array.isArray(sanitizedCreate.photos) && sanitizedCreate.photos.length > 0) {
      sanitizedCreate.photo = typeof sanitizedCreate.photos[0] === 'string' ? sanitizedCreate.photos[0] : null;
    }
    Object.assign(sanitizedCreate, sanitizeProductTextFields(sanitizedCreate));
    if (!sanitizedCreate.tildaUid && titleStr) {
      sanitizedCreate.tildaUid = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    const productWithoutCategories = await productService.createProduct(
      sanitizedCreate as Prisma.ProductCreateInput,
      categoryIds,
      brandId
    );
    await revalidateCatalogForProduct({
      productId: productWithoutCategories.id,
      extraCategoryIds: categoryIds,
    });
    return NextResponse.json(productWithoutCategories);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

const deleteProductSchema = z.object({ id: z.string().min(1, 'Product ID is required') });

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  let parsed: z.infer<typeof deleteProductSchema>;
  try {
    const raw = await request.json();
    parsed = deleteProductSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id } = parsed;

  try {
    const productCategories = await prisma.productCategory.findMany({
      where: { productId: id },
      select: { categoryId: true },
    });
    const categoryIdsToRevalidate = productCategories.map((item) => item.categoryId);

    const existingProduct = await productService.findProductByIdInBrandScope(id, brandId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const deletedProduct = await productService.deleteProduct(id);
    await revalidateCatalogForProduct({
      productId: id,
      extraCategoryIds: categoryIdsToRevalidate,
    });
    return NextResponse.json(deletedProduct);
  } catch (error) {
    console.error('Error deleting product:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    const isForeignKeyConstraint =
      errorCode === 'P2003' || /foreign key constraint|violates foreign key/i.test(errorMessage);

    if (isForeignKeyConstraint) {
      const dependencyStats = await productService.getProductDeleteDependencyStats(id);
      const dependencyLabelByKey: Record<keyof typeof dependencyStats, string> = {
        productCategories: 'Категории товара',
        cartItems: 'Корзина',
        orderItems: 'Позиции заказов',
        quickOrders: 'Быстрые заявки',
        giftPromotions: 'Подарочные акции',
      };
      const dependencyDetails = (Object.keys(dependencyStats) as Array<keyof typeof dependencyStats>)
        .filter((key) => dependencyStats[key] > 0)
        .map((key) => `- ${dependencyLabelByKey[key]}: ${dependencyStats[key]}`);

      return NextResponse.json(
        {
          error: dependencyDetails.length
            ? `Нельзя удалить товар: найдены связанные записи.\n${dependencyDetails.join('\n')}\n\nСнимите связи или скройте товар как черновик.`
            : 'Нельзя удалить товар: он уже используется в связанных данных. Снимите связи или скройте товар как черновик.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}