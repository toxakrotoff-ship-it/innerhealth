import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
