'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { resolveBrand, type BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';
import {
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
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryInput {
  title: string;
  slug: string;
  image?: string | null;
  sortOrder?: number | null;
  parentId?: string | null;
  showInCategoriesBlock?: boolean;
}

interface BrandScopeOptions {
  brandId?: BrandId | null;
}

async function resolveEffectiveBrandId(brandId?: BrandId | null): Promise<BrandId> {
  if (brandId) return brandId;
  const headerStore = await headers();
  const cookieStore = await cookies();
  return resolveBrand({
    forwardedBrand: headerStore.get('x-brand'),
    cookieBrand: cookieStore.get('ih_active_brand')?.value ?? null,
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
});

const categoryUpdateSchema = categoryInputSchema.partial();

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
    const categories = await prisma.category.findMany({
      where: { brand: dbBrand },
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        sortOrder: true,
        parentId: true,
        showInCategoriesBlock: true,
        createdAt: true,
        updatedAt: true,
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
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { title: 'asc' }
      ]
    });
    
    // Преобразуем результат в нужный формат
    return categories.map(category => ({
      ...category,
      productCount: category.products.filter((item) =>
        productBelongsToBrandScope(item.product.brand, effectiveBrandId)
      ).length
    }));
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
    
    // Возвращаем только категории без промежуточных данных
    return productCategories.map(pc => pc.category);
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
    
    console.log('Fetching categories from DB...');
    // Используем Prisma напрямую для получения категорий
    const categories = await prisma.category.findMany({
      where: { brand: dbBrand },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { title: 'asc' }
      ]
    });
    
    console.log('Categories from DB:', categories);
    return categories;
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
    
    return category;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

// Создание новой категории
export async function createCategory(
  data: CategoryInput,
  options: BrandScopeOptions = {}
): Promise<Category> {
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
    
    const parsed = categoryInputSchema.parse({
      ...data,
      slug: data.slug.trim().toLowerCase(),
      image: data.image?.trim() ? data.image.trim() : null,
      parentId: data.parentId?.trim() ? data.parentId.trim() : null,
      sortOrder: data.sortOrder ?? null,
      showInCategoriesBlock: data.showInCategoriesBlock ?? true,
    });

    await ensureCategoryParentExists(parsed.parentId, effectiveBrandId);
    await ensureNoCategoryCycle(null, parsed.parentId);

    // Используем Prisma напрямую для создания категории, чтобы избежать проблем с генерацией ID
    const category = await prisma.category.create({
      data: {
        brand: dbBrand,
        title: parsed.title,
        slug: parsed.slug,
        image: parsed.image,
        sortOrder: parsed.sortOrder,
        parentId: parsed.parentId,
        showInCategoriesBlock: parsed.showInCategoriesBlock ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    revalidatePath('/admin/catalog');
    revalidatePath('/');
    revalidatePath('/catalog');
    return category;
  } catch (error) {
    console.error('Error creating category:', error);
    console.error('Error type:', typeof error);
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
): Promise<Category> {
  const effectiveBrandId = await resolveEffectiveBrandId(options.brandId);
  const dbBrand = resolveDbBrand(effectiveBrandId);
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      select: { brand: true },
    });
    if (!existingCategory || existingCategory.brand !== dbBrand) {
      throw new Error('Категория не найдена в выбранном бренде');
    }

    const parsed = categoryUpdateSchema.parse({
      ...data,
      slug:
        data.slug === undefined
          ? undefined
          : data.slug.trim().toLowerCase(),
      image: data.image === undefined ? undefined : data.image?.trim() ? data.image.trim() : null,
      parentId: data.parentId === undefined ? undefined : data.parentId?.trim() ? data.parentId.trim() : null,
      sortOrder: data.sortOrder ?? null,
      showInCategoriesBlock: data.showInCategoriesBlock,
    });

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

    const category = await prisma.category.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.category.update>[0]['data'],
    });
    
    revalidatePath('/admin/catalog');
    revalidatePath('/');
    revalidatePath('/catalog');
    return category;
  } catch (error) {
    console.error('Error updating category:', error);
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
  revalidatePath('/admin/catalog');
  revalidatePath('/');
  revalidatePath('/catalog');
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
      select: { brand: true },
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
    
    revalidatePath('/admin/catalog');
    revalidatePath('/');
    revalidatePath('/catalog');
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