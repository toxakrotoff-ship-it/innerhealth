import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getPostPath } from '@/lib/post-url';

/** Get all posts for admin. */
export async function getPostsForAdmin() {
  return prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/** Get existing post slugs (for slugifyUnique). */
export async function getExistingPostSlugs() {
  const existing = await prisma.post.findMany({ select: { slug: true } });
  return existing.map((p) => p.slug);
}

/** Find post by id. */
export async function findPostById(id: string) {
  return prisma.post.findUnique({
    where: { id },
  });
}

/** Create post. */
export async function createPost(data: Prisma.PostCreateInput) {
  return prisma.post.create({
    data,
  });
}

/** Update post. */
export async function updatePost(id: string, data: Prisma.PostUpdateInput) {
  return prisma.post.update({
    where: { id },
    data,
  });
}

/** Delete post. */
export async function deletePost(id: string) {
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
