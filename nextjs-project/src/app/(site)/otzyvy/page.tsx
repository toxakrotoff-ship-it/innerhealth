import { prisma } from '@/lib/prisma';
import { ReviewsSection } from './reviews-section';

type ReviewRow = {
  id: string;
  authorName: string;
  socialLink: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: Date;
};

export default async function ReviewsPage() {
  const reviews: ReviewRow[] = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const serialized = reviews.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    socialLink: r.socialLink,
    text: r.text,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-8">Отзывы</h1>
      <ReviewsSection initialReviews={serialized} />
    </div>
  );
}
