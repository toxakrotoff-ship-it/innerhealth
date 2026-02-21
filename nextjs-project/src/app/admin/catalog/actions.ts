'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface Category {
  id: string;
  title: string;
  slug: string;
  image?: string;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  productId: string;
  categoryId: string;
}

// Получение всех категорий с количеством товаров
export async function getCategoriesWithCounts(): Promise<(Category & { productCount: number })[]> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    // Используем Prisma для получения категорий с количеством товаров
    const categories = await prisma.category.findMany({
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
            products: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { title: 'asc' }
      ]
    });
    
    // Преобразуем результат в нужный формат
    return categories.map(category => ({
      ...category,
      productCount: category._count.products
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
export async function getCategories(): Promise<Category[]> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    console.log('Fetching categories from DB...');
    // Используем Prisma напрямую для получения категорий
    const categories = await prisma.category.findMany({
      orderBy: [
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
export async function createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
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
    
    // Используем Prisma напрямую для создания категории, чтобы избежать проблем с генерацией ID
    const category = await prisma.category.create({
      data: {
        title: data.title,
        slug: data.slug,
        image: data.image,
        sortOrder: data.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    revalidatePath('/admin/catalog');
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
export async function updateCategory(id: string, data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Category> {
  try {
    // Проверяем, что prisma инициализирован
    if (!prisma) {
      throw new Error('Database connection is not initialized');
    }
    
    const category = await prisma.category.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        image: data.image,
        sortOrder: data.sortOrder,
        updatedAt: new Date()
      }
    });
    
    revalidatePath('/admin/catalog');
    return category;
  } catch (error) {
    console.error('Error updating category:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }
    throw new Error('Failed to update category');
  }
}

// Удаление категории
export async function deleteCategory(id: string): Promise<void> {
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
export async function getProductsByCategory(categoryId: string): Promise<any[]> {
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