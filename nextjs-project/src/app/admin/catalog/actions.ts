'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { revalidateCatalogForProduct, revalidateCategoryStorefront } from '@/lib/catalog-revalidation';
import { cookies, headers } from 'next/headers';
import { z, ZodError } from 'zod';
import { Prisma, type Category as PrismaCategory } from '@prisma/client';
import type { BrandId } from '@/lib/brand/brand';
import { resolveAdminBrand, ACTIVE_BRAND_COOKIE_NAME, ADMIN_BRAND_COOKIE_NAME } from '@/lib/brand/brand-context';
import { resolveDbBrand } from '@/lib/brand/brand-db';
import {
  isSprintPowerBrand,
  productBelongsToBrandScope,
} from '@/lib/brand/brand-scope';

export interface Category {
  id: string;
  title: string;
  slug: string;
  image?: string | null;
  sortOrder?: number | null;
  parentId?: string | null;
  showInCategoriesBlock: boolean;
  catalogTeaser?: string | null;
  linePageBodyRichJson?: Prisma.JsonValue | null;
  featuredProductId?: string | null;
  showLegacyLinePageBlocks?: boolean;
  /** ISO-8601 из Server Actions / JSON (без объектов Date в ответе). */
  createdAt: string;
  updatedAt: string;
}

interface CategoryInput {
  title: string;
  slug: string;
  image?: string | null;
  sortOrder?: number | null;
  parentId?: string | null;
  showInCategoriesBlock?: boolean;
  catalogTeaser?: string | null;
  linePageBodyRichJson?: Prisma.JsonValue | null;
  featuredProductId?: string | null;
  showLegacyLinePageBlocks?: boolean;
}

interface BrandScopeOptions {
  brandId?: BrandId | null;
}

async function resolveEffectiveBrandId(brandId?: BrandId | null): Promise<BrandId> {
  if (brandId) return brandId;
  const headerStore = await headers();
  const cookieStore = await cookies();
  return resolveAdminBrand({
    forwardedBrand: headerStore.get('x-brand'),
    adminBrandCookie: cookieStore.get(ADMIN_BRAND_COOKIE_NAME)?.value ?? null,
    activeBrandCookie: cookieStore.get(ACTIVE_BRAND_COOKIE_NAME)?.value ?? null,
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  });
}

const categoryInputSchema = z.object({
  title: z.string().trim().min(1, 'Название категории обязательно'),
  slug: z.string().trim().min(1, 'Slug обязателен'),
  image: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().nullable().optional(),
  parentId: z.string().trim().nullable().optional(),
  showInCategoriesBlock: z.boolean().optional(),
  catalogTeaser: z.string().max(20000).nullable().optional(),
  linePageBodyRichJson: z.unknown().optional(),
  featuredProductId: z.string().nullable().optional(),
  showLegacyLinePageBlocks: z.boolean().optional(),
});

const categoryUpdateSchema = categoryInputSchema.partial();

/** ~450 KB JSON — защита прокси и Server Action от чрезмерного тела. */
const MAX_LINE_PAGE_JSON_CHARS = 450_000;

function formatZodCategoryError(err: ZodError): string {
  const parts = err.issues.map((issue) => `${issue.path.join('.') || 'данные'}: ${issue.message}`);
  return parts.length > 0 ? parts.join('; ') : 'Некорректные данные категории';
}

/** JSONB: `null` в JS — не то же самое, что NULL в БД; для очистки поля нужен `DbNull`. */
function linePageJsonForWrite(
  value: unknown | null | undefined
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

/** Клиент не может подставить Sprint-поля при админке Inner — выкидываем до zod/Prisma. */
function stripSprintOnlyCategoryFields<T extends Partial<CategoryInput> | CategoryInput>(
  payload: T,
  brandId: BrandId
): T {
  if (isSprintPowerBrand(brandId)) return payload;
  const rest = { ...(payload as Record<string, unknown>) };
  delete rest.catalogTeaser;
  delete rest.linePageBodyRichJson;
  delete rest.featuredProductId;
  delete rest.showLegacyLinePageBlocks;
  return rest as T;
}

function assertSprintLinePageBodyWithinLimit(value: unknown): void {
  if (value === undefined || value === null) return;
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error('Текст страницы категории содержит недопустимые данные.');
  }
  if (serialized.length > MAX_LINE_PAGE_JSON_CHARS) {
    const kb = Math.round(serialized.length / 1024);
    const limitKb = Math.round(MAX_LINE_PAGE_JSON_CHARS / 1024);
    throw new Error(
      `Текст под сеткой слишком большой (${kb} KB). Сократите объём или уберите лишние вставки (лимит ~${limitKb} KB).`
    );
  }
}

const innerCategoryAdminListSelect = {
  id: true,
  brand: true,
  title: true,
  slug: true,
  image: true,
  sortOrder: true,
  parentId: true,
  showInCategoriesBlock: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CategorySelect;

type InnerCategoryAdminListRow = Prisma.CategoryGetPayload<{
  select: typeof innerCategoryAdminListSelect;
}>;

function mapInnerCategoryAdminListRow(row: InnerCategoryAdminListRow): Category {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    image: row.image,
    sortOrder: row.sortOrder,
    parentId: row.parentId,
    showInCategoriesBlock: row.showInCategoriesBlock,
    catalogTeaser: null,
    linePageBodyRichJson: null,
    featuredProductId: null,
    showLegacyLinePageBlocks: false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPrismaCategoryToAdmin(row: PrismaCategory): Category {
  const sprintRow = isSprintPowerBrand(row.brand as BrandId);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    image: row.image,
    sortOrder: row.sortOrder,
    parentId: row.parentId,
    showInCategoriesBlock: row.showInCategoriesBlock,
    catalogTeaser: sprintRow ? (row.catalogTeaser ?? null) : null,
    linePageBodyRichJson:
      sprintRow && row.linePageBodyRichJson != null
        ? (JSON.parse(JSON.stringify(row.linePageBodyRichJson)) as Prisma.JsonValue)
        : null,
    featuredProductId: sprintRow ? (row.featuredProductId ?? null) : null,
    showLegacyLinePageBlocks: sprintRow ? row.showLegacyLinePageBlocks : false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

type ProductCategoryDelegate = Pick<typeof prisma, 'productCategory'>;

async function assertFeaturedProductInCategory(
  categoryId: string,
  productId: string,
  brandId: BrandId,
  db: ProductCategoryDelegate = prisma
): Promise<void> {
  const link = await db.productCategory.findFirst({
    where: { categoryId, productId },
    include: {
      product: { select: { brand: true, isDraft: true } },
    },
  });
  if (!link) {
    throw new Error('Товар для блока линейки должен быть привязан к этой категории (карточка товара → категории).');
  }
  if (link.product.isDraft) {
    throw new Error('Нельзя выбрать черновик как товар линейки.');
  }
  if (!productBelongsToBrandScope(link.product.brand, brandId)) {
    throw new Error('Товар не относится к бренду этой витрины.');
  }
}

function revalidateCategoryPaths(slugs: string[]): void {
  revalidateCategoryStorefront(slugs);
}

async function ensureCategoryParentExists(
  parentId: string | null | undefined,
  brandId: BrandId
): Promise<void> {
  if (!parentId) return;

  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true, brand: true },
  });

  if (!parent || parent.brand !== resolveDbBrand(brandId)) {
    throw new Error('Выбранная родительская категория не найдена');
  }
}

async function ensureNoCategoryCycle(
  categoryId: string | null,
  parentId: string | null | undefined
): Promise<void> {
  if (!parentId) return;
  if (categoryId && categoryId === parentId) {
    throw new Error('Категория не может быть родителем самой себя');
  }

  const visited = new Set<string>();
  let currentParentId: string | null = parentId;

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      throw new Error('Обнаружен цикл в дереве категорий');
    }
    if (categoryId && currentParentId === categoryId) {
      throw new Error('Нельзя выбрать дочернюю категорию в качестве родителя');
    }

    visited.add(currentParentId);
    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });

    if (!parent) break;
    currentParentId = parent.parentId;
  }
}

export interface ProductCategory {
  productId: string;
  categoryId: string;
}

type ProductEntity = Prisma.ProductGetPayload<Record<string, never>>;

// Получение всех категорий с количеством товаров
export async function getCategoriesWithCounts(
  options: BrandScopeOptions = {}
): Promise<(Category & { productCount: number })[]> {
  const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
  const dbBrand = resolveDbBrand(effectiveBrandId);
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    // Используем Prisma для получения категорий с количеством товаров
    const orderBy = [
      { parentId: 'asc' as const },
      { sortOrder: 'asc' as const },
      { title: 'asc' as const },
    ];

    const categories = await prisma.category.findMany({
      where: { brand: dbBrand },
      select: {
        ...innerCategoryAdminListSelect,
        ...(isSprintPowerBrand(effectiveBrandId)
          ? {
              catalogTeaser: true,
              linePageBodyRichJson: true,
              featuredProductId: true,
              showLegacyLinePageBlocks: true,
            }
          : {}),
        products: {
          select: {
            product: {
              select: {
                brand: true,
              },
            },
          },
        },
      },
      orderBy,
    });

    return categories.map((row) => {
      const { products, ...cat } = row;
      const base = isSprintPowerBrand(effectiveBrandId)
        ? mapPrismaCategoryToAdmin(cat as PrismaCategory)
        : mapInnerCategoryAdminListRow(cat as InnerCategoryAdminListRow);
      return {
        ...base,
        productCount: products.filter((item) =>
          productBelongsToBrandScope(item.product.brand, effectiveBrandId)
        ).length,
      };
    });
  } catch (error) {
    console.error('Error fetching categories with counts:', error);
    return [];
  }
}

// Получение категорий товара
export async function getProductCategories(productId: string): Promise<Category[]> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    // Используем Prisma для получения категорий товара
    const productCategories = await prisma.productCategory.findMany({
      where: { productId },
      include: {
        category: true
      },
      orderBy: {
        category: {
          title: 'asc'
        }
      }
    });
    
    return productCategories.map((pc) => mapPrismaCategoryToAdmin(pc.category));
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }
}

// Назначение категорий товару
export async function setProductCategories(productId: string, categoryIds: string[]): Promise<void> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }

    const previousCategoryIds = (
      await prisma.productCategory.findMany({
        where: { productId },
        select: { categoryId: true },
      })
    ).map((row) => row.categoryId);

    // Удаляем все существующие связи
    await prisma.productCategory.deleteMany({
      where: { productId }
    });
    
    // Добавляем новые связи
    if (categoryIds.length > 0) {
      const links = categoryIds.map(categoryId => ({
        productId,
        categoryId
      }));
      
      await prisma.productCategory.createMany({
        data: links
      });
    }

    await revalidateCatalogForProduct({
      productId,
      extraCategoryIds: [...previousCategoryIds, ...categoryIds],
    });
    
    revalidatePath('/admin/catalog');
    revalidatePath(`/admin/products/${productId}`);
  } catch (error) {
    console.error('Error setting product categories:', error);
    // Более подробное сообщение об ошибке
    if (error instanceof Error) {
      throw new Error(`Failed to set product categories: ${error.message}`);
    }
    throw new Error('Failed to set product categories');
  }
}

// Получение списка всех категорий
export async function getCategories(options: BrandScopeOptions = {}): Promise<Category[]> {
  const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
  const dbBrand = resolveDbBrand(effectiveBrandId);
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    const orderBy = [
      { parentId: 'asc' as const },
      { sortOrder: 'asc' as const },
      { title: 'asc' as const },
    ];

    if (isSprintPowerBrand(effectiveBrandId)) {
      const categories = await prisma.category.findMany({
        where: { brand: dbBrand },
        orderBy,
      });
      return categories.map(mapPrismaCategoryToAdmin);
    }

    const categories = await prisma.category.findMany({
      where: { brand: dbBrand },
      select: innerCategoryAdminListSelect,
      orderBy,
    });

    return categories.map(mapInnerCategoryAdminListRow);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Возвращаем пустой массив вместо выброса ошибки для устойчивости
    return [];
  }
}

// Получение отдельной категории по ID
export async function getCategory(id: string): Promise<Category | null> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    const category = await prisma.category.findUnique({
      where: { id }
    });

    return category ? mapPrismaCategoryToAdmin(category) : null;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

// Создание новой категории
export async function createCategory(
  data: CategoryInput,
  options: BrandScopeOptions = {}
): Promise<void> {
  const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
  const dbBrand = resolveDbBrand(effectiveBrandId);
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      console.error('Prisma is not initialized');
      throw new Error('Database connection is not initialized');
    }
    
    // Проверяем, что модель Category доступна
    if (!prisma.category) {
      console.error('Category model is not available in prisma');
      console.error('Available models:', Object.keys(prisma));
      throw new Error('Category model is not available in database connection');
    }
    
    const dataScoped = stripSprintOnlyCategoryFields(data, effectiveBrandId);
    const parsed = categoryInputSchema.parse({
      ...dataScoped,
      slug: dataScoped.slug.trim().toLowerCase(),
      image: dataScoped.image?.trim() ? dataScoped.image.trim() : null,
      parentId: dataScoped.parentId?.trim() ? dataScoped.parentId.trim() : null,
      sortOrder: dataScoped.sortOrder ?? null,
      showInCategoriesBlock: dataScoped.showInCategoriesBlock ?? true,
      catalogTeaser: dataScoped.catalogTeaser?.trim() ? dataScoped.catalogTeaser.trim() : null,
      linePageBodyRichJson: dataScoped.linePageBodyRichJson,
      featuredProductId: dataScoped.featuredProductId,
      showLegacyLinePageBlocks: dataScoped.showLegacyLinePageBlocks,
    });

    if (isSprintPowerBrand(effectiveBrandId)) {
      assertSprintLinePageBodyWithinLimit(parsed.linePageBodyRichJson);
    }

    await ensureCategoryParentExists(parsed.parentId, effectiveBrandId);
    await ensureNoCategoryCycle(null, parsed.parentId);

    const featuredProductId = normalizeOptionalId(parsed.featuredProductId);
    const lineJson = linePageJsonForWrite(parsed.linePageBodyRichJson);

    const category = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.create({
        data: {
          brand: dbBrand,
          title: parsed.title,
          slug: parsed.slug,
          image: parsed.image,
          sortOrder: parsed.sortOrder,
          parentId: parsed.parentId,
          showInCategoriesBlock: parsed.showInCategoriesBlock ?? true,
          catalogTeaser: parsed.catalogTeaser ?? null,
          ...(lineJson !== undefined ? { linePageBodyRichJson: lineJson } : {}),
          showLegacyLinePageBlocks: parsed.showLegacyLinePageBlocks ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      if (featuredProductId) {
        await assertFeaturedProductInCategory(cat.id, featuredProductId, effectiveBrandId, tx);
        return tx.category.update({
          where: { id: cat.id },
          data: {
            featuredProduct: { connect: { id: featuredProductId } },
            updatedAt: new Date(),
          },
        });
      }
      return cat;
    });

    revalidateCategoryPaths([category.slug]);
    revalidatePath('/admin/catalog');
  } catch (error) {
    console.error('Error creating category:', error);
    if (error instanceof ZodError) {
      throw new Error(formatZodCategoryError(error));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Категория с таким slug уже существует для этого бренда.');
      }
      if (error.code === 'P2022') {
        throw new Error('Схема БД устарела: выполните миграции Prisma для таблицы категорий.');
      }
      throw new Error(`Ошибка БД (${error.code}): ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
    throw new Error('Failed to create category');
  }
}

// Обновление категории
export async function updateCategory(
  id: string,
  data: Partial<CategoryInput>,
  options: BrandScopeOptions = {}
): Promise<void> {
  const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
  const dbBrand = resolveDbBrand(effectiveBrandId);
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      select: { brand: true, slug: true },
    });
    if (!existingCategory || existingCategory.brand !== dbBrand) {
      throw new Error('Категория не найдена в выбранном бренде');
    }

    const dataScoped = stripSprintOnlyCategoryFields(data, effectiveBrandId);
    const parsed = categoryUpdateSchema.parse({
      ...dataScoped,
      slug:
        dataScoped.slug === undefined
          ? undefined
          : dataScoped.slug.trim().toLowerCase(),
      image: dataScoped.image === undefined ? undefined : dataScoped.image?.trim() ? dataScoped.image.trim() : null,
      parentId:
        dataScoped.parentId === undefined
          ? undefined
          : dataScoped.parentId?.trim()
            ? dataScoped.parentId.trim()
            : null,
      sortOrder: dataScoped.sortOrder ?? null,
      showInCategoriesBlock: dataScoped.showInCategoriesBlock,
      catalogTeaser:
        dataScoped.catalogTeaser === undefined
          ? undefined
          : dataScoped.catalogTeaser?.trim()
            ? dataScoped.catalogTeaser.trim()
            : null,
      linePageBodyRichJson: dataScoped.linePageBodyRichJson,
      featuredProductId: dataScoped.featuredProductId,
      showLegacyLinePageBlocks: dataScoped.showLegacyLinePageBlocks,
    });

    if (isSprintPowerBrand(effectiveBrandId) && parsed.linePageBodyRichJson !== undefined) {
      assertSprintLinePageBodyWithinLimit(parsed.linePageBodyRichJson);
    }

    if (parsed.parentId !== undefined) {
      await ensureCategoryParentExists(parsed.parentId, effectiveBrandId);
      await ensureNoCategoryCycle(id, parsed.parentId);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (parsed.title !== undefined) updateData.title = parsed.title;
    if (parsed.slug !== undefined) updateData.slug = parsed.slug;
    if (parsed.image !== undefined) updateData.image = parsed.image;
    if (parsed.sortOrder !== undefined) updateData.sortOrder = parsed.sortOrder;
    if (parsed.showInCategoriesBlock !== undefined) {
      updateData.showInCategoriesBlock = parsed.showInCategoriesBlock;
    }
    if (parsed.parentId !== undefined) {
      updateData.parent = parsed.parentId
        ? { connect: { id: parsed.parentId } }
        : { disconnect: true };
    }
    if (parsed.catalogTeaser !== undefined) {
      updateData.catalogTeaser = parsed.catalogTeaser;
    }
    if (parsed.showLegacyLinePageBlocks !== undefined) {
      updateData.showLegacyLinePageBlocks = parsed.showLegacyLinePageBlocks;
    }
    if (parsed.linePageBodyRichJson !== undefined) {
      const lineJson = linePageJsonForWrite(parsed.linePageBodyRichJson);
      if (lineJson !== undefined) {
        updateData.linePageBodyRichJson = lineJson;
      }
    }
    if (parsed.featuredProductId !== undefined) {
      const v = normalizeOptionalId(parsed.featuredProductId);
      if (v) {
        await assertFeaturedProductInCategory(id, v, effectiveBrandId);
        updateData.featuredProduct = { connect: { id: v } };
      } else {
        updateData.featuredProduct = { disconnect: true };
      }
    }

    await prisma.category.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.category.update>[0]['data'],
    });

    const slugsToRevalidate = new Set<string>();
    if (existingCategory.slug) slugsToRevalidate.add(existingCategory.slug);
    if (parsed.slug !== undefined && parsed.slug !== existingCategory.slug) {
      slugsToRevalidate.add(parsed.slug);
    }
    revalidateCategoryPaths(Array.from(slugsToRevalidate));
    revalidatePath('/admin/catalog');
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof ZodError) {
      throw new Error(formatZodCategoryError(error));
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Категория с таким slug уже существует для этого бренда.');
      }
      if (error.code === 'P2022') {
        throw new Error('Схема БД устарела: выполните миграции Prisma для таблицы категорий.');
      }
      throw new Error(`Ошибка БД (${error.code}): ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
    throw new Error('Failed to update category');
  }
}

const categorySortUpdateSchema = z.array(
  z.object({ id: z.string().min(1), sortOrder: z.number().int().min(0) })
);

/** Обновление порядка сортировки нескольких категорий (для drag-and-drop). */
export async function updateCategoriesSortOrder(
  updates: { id: string; sortOrder: number }[],
  options: BrandScopeOptions = {}
): Promise<void> {
  const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
  const dbBrand = resolveDbBrand(effectiveBrandId);
  const parsed = categorySortUpdateSchema.parse(updates);
  if (!prisma) throw new Error('Database connection is not initialized');

  const categories = await prisma.category.findMany({
    where: { id: { in: parsed.map((item) => item.id) } },
    select: { id: true, brand: true },
  });
  const allInScope = categories.every((category) => category.brand === dbBrand);
  if (!allInScope) {
    throw new Error('Нельзя менять порядок категорий другого бренда');
  }

  await prisma.$transaction(
    parsed.map(({ id, sortOrder }) =>
      prisma.category.update({
        where: { id },
        data: { sortOrder, updatedAt: new Date() },
      })
    )
  );
  revalidateCategoryStorefront([]);
  revalidatePath('/admin/catalog');
}

// Удаление категории
export async function deleteCategory(
  id: string,
  options: BrandScopeOptions = {}
): Promise<void> {
    const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
    const dbBrand = resolveDbBrand(effectiveBrandId);
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      select: { brand: true, slug: true },
    });
    if (!existingCategory || existingCategory.brand !== dbBrand) {
      throw new Error('Категория не найдена в выбранном бренде');
    }

  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    // Сначала удаляем связи продукта с категорией
    await prisma.productCategory.deleteMany({
      where: { categoryId: id }
    });
    
    // Затем удаляем саму категорию
    await prisma.category.delete({
      where: { id }
    });

    if (existingCategory.slug) {
      revalidateCategoryPaths([existingCategory.slug]);
    }
    revalidatePath('/admin/catalog');
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
    throw new Error('Failed to delete category');
  }
}

// Получение количества продуктов в категории
export async function getCategoryProductCount(categoryId: string): Promise<number> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    // Используем Prisma для получения количества продуктов в категории
    const count = await prisma.productCategory.count({
      where: { categoryId }
    });
    
    return count;
  } catch (error) {
    console.error('Error fetching category product count:', error);
    return 0;
  }
}

// Получение всех товаров с фильтрацией по категории
export async function getProductsByCategory(categoryId: string): Promise<ProductEntity[]> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    // Используем Prisma для получения товаров по категории
    const productCategories = await prisma.productCategory.findMany({
      where: { categoryId },
      include: {
        product: true
      }
    });
    
    // Возвращаем только продукты без промежуточных данных
    return productCategories.map(p => p.product);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}