import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Get approved reviews (for public carousel). */
export async function getApprovedReviews() {
  return prisma.review.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
  });
}

/** Get all reviews for admin (with selected fields). */
export async function getReviewsForAdmin() {
  return prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      authorName: true,
      socialLink: true,
      text: true,
      imageUrl: true,
      status: true,
      createdAt: true,
    },
  });
}

/** Find review by id. */
export async function findReviewById(id: string) {
  return prisma.review.findUnique({
    where: { id },
  });
}

/** Create review. */
export async function createReview(data: Prisma.ReviewCreateInput) {
  return prisma.review.create({
    data,
  });
}

/** Update review. */
export async function updateReview(id: string, data: Prisma.ReviewUpdateInput) {
  return prisma.review.update({
    where: { id },
    data,
  });
}

/** Delete review. */
export async function deleteReview(id: string) {
  return prisma.review.delete({
    where: { id },
  });
}
