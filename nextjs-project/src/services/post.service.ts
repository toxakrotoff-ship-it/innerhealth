import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPostPath } from '@/lib/post-url';
import type { BrandId } from '@/lib/brand/brand';

const SPRINT_POWER_SLUG_PREFIX = 'sp-';

function isSprintPowerBrand(brandId: BrandId | null | undefined): boolean {
  return brandId === 'sprint-power';
}

function isPostInBrandScope(slug: string, brandId: BrandId | null | undefined): boolean {
  if (isSprintPowerBrand(brandId)) {
    return slug.startsWith(SPRINT_POWER_SLUG_PREFIX);
  }
  return !slug.startsWith(SPRINT_POWER_SLUG_PREFIX);
}

function normalizeSlugForBrand(rawSlug: string, brandId: BrandId | null | undefined): string {
  const slug = rawSlug.trim();
  if (isSprintPowerBrand(brandId)) {
    return slug.startsWith(SPRINT_POWER_SLUG_PREFIX)
      ? slug
      : `${SPRINT_POWER_SLUG_PREFIX}${slug}`;
  }
  return slug.replace(new RegExp(`^${SPRINT_POWER_SLUG_PREFIX}`), '');
}

/** Get all posts for admin. */
export async function getPostsForAdmin(brandId?: BrandId | null) {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return posts.filter((post) => isPostInBrandScope(post.slug, brandId));
}

/** Get existing post slugs (for slugifyUnique). */
export async function getExistingPostSlugs(brandId?: BrandId | null) {
  const existing = await prisma.post.findMany({ select: { slug: true } });
  return existing
    .map((p) => p.slug)
    .filter((slug) => isPostInBrandScope(slug, brandId))
    .map((slug) => normalizeSlugForBrand(slug, brandId));
}

/** Find post by id. */
export async function findPostById(id: string, brandId?: BrandId | null) {
  const post = await prisma.post.findUnique({
    where: { id },
  });
  if (!post) return null;
  return isPostInBrandScope(post.slug, brandId) ? post : null;
}

/** Create post. */
export async function createPost(data: Prisma.PostCreateInput, brandId?: BrandId | null) {
  const preparedData: Prisma.PostCreateInput = {
    ...data,
    slug: normalizeSlugForBrand(data.slug, brandId),
  };
  return prisma.post.create({
    data: preparedData,
  });
}

/** Update post. */
export async function updatePost(id: string, data: Prisma.PostUpdateInput, brandId?: BrandId | null) {
  const existing = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
  if (!existing || !isPostInBrandScope(existing.slug, brandId)) {
    throw new Error('Post not found in selected brand scope');
  }

  const preparedData: Prisma.PostUpdateInput = { ...data };
  if (typeof data.slug === 'string') {
    preparedData.slug = normalizeSlugForBrand(data.slug, brandId);
  }

  return prisma.post.update({
    where: { id },
    data: preparedData,
  });
}

/** Delete post. */
export async function deletePost(id: string, brandId?: BrandId | null) {
  const existing = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
  if (!existing || !isPostInBrandScope(existing.slug, brandId)) {
    throw new Error('Post not found in selected brand scope');
  }
  return prisma.post.delete({
    where: { id },
  });
}

/** Suggest posts for internal links in the news editor (admin). */
export async function suggestPostsForLink(query: string, limit: number) {
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

  const rows = await prisma.post.findMany({
    where,
    select: { id: true, title: true, slug: true, type: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    href: getPostPath({ type: p.type, slug: p.slug }),
  }));
}
