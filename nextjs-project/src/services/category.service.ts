import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Get all categories (for admin catalog). */
export async function getCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
}

/** Get categories with product count. */
export async function getCategoriesWithProductCount() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      image: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { products: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });
  return categories.map((c) => ({
    ...c,
    productCount: c._count.products,
  }));
}

/** Get product categories (for a product). */
export async function getProductCategories(productId: string) {
  const productCategories = await prisma.productCategory.findMany({
    where: { productId },
    include: { category: true },
    orderBy: { category: { title: 'asc' } },
  });
  return productCategories.map((pc) => pc.category);
}

/** Set product categories (replace all links). */
export async function setProductCategories(
  productId: string,
  categoryIds: string[]
) {
  await prisma.productCategory.deleteMany({ where: { productId } });
  if (categoryIds.length > 0) {
    await prisma.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({ productId, categoryId })),
    });
  }
}

/** Find category by id. */
export async function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

/** Find category by slug. */
export async function findCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
  });
}

/** Create category. */
export async function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({
    data,
  });
}

/** Update category. */
export async function updateCategory(
  id: string,
  data: Prisma.CategoryUpdateInput
) {
  return prisma.category.update({
    where: { id },
    data,
  });
}

/** Delete category (and product-category links). */
export async function deleteCategory(id: string) {
  await prisma.productCategory.deleteMany({ where: { categoryId: id } });
  return prisma.category.delete({ where: { id } });
}

/** Count products in category. */
export async function getCategoryProductCount(categoryId: string) {
  return prisma.productCategory.count({
    where: { categoryId },
  });
}

/** Suggest catalog categories for internal links in the news editor (admin). */
export async function suggestCategoriesForLink(query: string, limit: number) {
  const q = query.trim();
  const where =
    q.length === 0
      ? undefined
      : {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { slug: { contains: q, mode: 'insensitive' as const } },
          ],
        };

  const rows = await prisma.category.findMany({
    where,
    select: { id: true, title: true, slug: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    take: limit,
  });

  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    href: `/catalog/${c.slug}`,
  }));
}

/** Get products by category. */
export async function getProductsByCategory(categoryId: string) {
  const productCategories = await prisma.productCategory.findMany({
    where: { categoryId },
    include: { product: true },
  });
  return productCategories.map((pc) => pc.product);
}
