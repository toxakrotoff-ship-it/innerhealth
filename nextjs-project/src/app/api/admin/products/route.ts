import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { slugify, slugifyUnique } from '@/lib/slugify';
import { sanitizeProductTextFields } from '@/lib/sanitize-text';

export async function GET(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    // Получение отдельного товара по ID (с категориями для формы редактирования)
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: { categories: true },
      });

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
  } else {
    // Получение списка товаров (с категориями для фильтра в админке)
    try {
      const products = await prisma.product.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          categories: {
            include: {
              category: { select: { id: true, title: true } }
            }
          }
        }
      });
      
      console.log('API Response data type:', typeof products);
      console.log('API Response is array:', Array.isArray(products));
      console.log('API Response count:', products.length);
      
      // Проверка, что возвращаемый тип данных корректен
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
}

export async function PUT(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, categoryIds, ...data } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли продукт
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Поля модели Product (без id, createdAt, updatedAt, связей)
    const productFields = ['tildaUid', 'slug', 'brand', 'sku', 'mark', 'category', 'title', 'description', 'text', 'photo', 'photos', 'price', 'quantity', 'priceOld', 'discountPrice', 'isPromoEligible', 'editions', 'modifications', 'externalId', 'parentUid', 'weight', 'length', 'width', 'height', 'seoTitle', 'seoDescr', 'seoKeywords', 'fbTitle', 'fbDescr', 'tab1', 'tab2', 'tab3', 'tab4', 'tab1Title', 'tab2Title', 'tab3Title', 'tab4Title'] as const;
    const characteristics = ['characteristicsNutrition100g', 'characteristicsKkal', 'characteristicsContraindications', 'characteristicsShelfLife', 'characteristicsShelfLife2', 'characteristicsNutrition100gProduct', 'characteristicsEnergyValue100g', 'characteristicsNutrition100g2', 'characteristicsNutritionPerPortion5g', 'characteristicsComposition', 'characteristicsKkal100gDailyDose', 'characteristicsFormulation', 'characteristicsCalorie', 'characteristicsFlacon200ml', 'characteristicsStorage'];
    const allFields = [...productFields, ...characteristics];
    const sanitizedData: Record<string, unknown> = {};
    for (const key of allFields) {
      if (key in data && data[key] !== undefined) sanitizedData[key] = data[key];
    }
    if (Array.isArray(sanitizedData.photos) && sanitizedData.photos.length > 0) {
      sanitizedData.photo = typeof sanitizedData.photos[0] === 'string' ? sanitizedData.photos[0] : null;
    }
    Object.assign(sanitizedData, sanitizeProductTextFields(sanitizedData));

    if (categoryIds !== undefined) {
      await prisma.productCategory.deleteMany({ where: { productId: id } });
      if (Array.isArray(categoryIds) && categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: categoryIds.map((categoryId: string) => ({ productId: id, categoryId })),
        });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: sanitizedData as Parameters<typeof prisma.product.update>[0]['data'],
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

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, price, quantity } = body as { id?: string; price?: number; quantity?: number };

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 0 || !Number.isInteger(quantity))) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const data: { price?: number; quantity?: number } = {};
    if (price !== undefined) data.price = price;
    if (quantity !== undefined) data.quantity = quantity;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Provide at least one of price, quantity' }, { status: 400 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH product error:', error);
    return NextResponse.json(
      { error: error && typeof (error as { code?: string }).code === 'string' && (error as { code: string }).code === 'P2025' ? 'Product not found' : 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { categoryIds, ...data } = body;

    // Ensure slug: generate from title if missing
    let slug = data.slug?.trim() || null;
    if (!slug && data.title) {
      const baseSlug = slugify(data.title);
      const existing = await prisma.product.findMany({ select: { slug: true } });
      const existingSlugs = existing.map((p) => p.slug).filter(Boolean) as string[];
      slug = slugifyUnique(baseSlug, existingSlugs);
    }
    const productFields = ['tildaUid', 'slug', 'brand', 'sku', 'mark', 'category', 'title', 'description', 'text', 'photo', 'photos', 'price', 'quantity', 'priceOld', 'discountPrice', 'isPromoEligible', 'editions', 'modifications', 'externalId', 'parentUid', 'weight', 'length', 'width', 'height', 'seoTitle', 'seoDescr', 'seoKeywords', 'fbTitle', 'fbDescr', 'tab1', 'tab2', 'tab3', 'tab4', 'tab1Title', 'tab2Title', 'tab3Title', 'tab4Title'] as const;
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
    if (!sanitizedCreate.tildaUid && data.title) {
      sanitizedCreate.tildaUid = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }

    const newProduct = await prisma.product.create({
      data: sanitizedCreate as Parameters<typeof prisma.product.create>[0]['data'],
    });

    // Если переданы categoryIds, создаем связи
    if (categoryIds && categoryIds.length > 0) {
      await prisma.productCategory.createMany({
        data: categoryIds.map((categoryId: string) => ({ productId: newProduct.id, categoryId })),
      });
    }
    
    // Возвращаем продукт без категорий (чтобы избежать проблем с типами)
    const productWithoutCategories = await prisma.product.findUnique({
      where: { id: newProduct.id }
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

export async function DELETE(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли продукт
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Удаляем продукт
    const deletedProduct = await prisma.product.delete({
      where: { id }
    });
    
    return NextResponse.json(deletedProduct);
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}