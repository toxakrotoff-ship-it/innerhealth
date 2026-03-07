import { prisma } from '@/lib/prisma';
import { ReviewsSection } from './reviews-section';
import { AdaptiveContainer } from '@/components/ui/adaptive-container';
import { ResponsiveText } from '@/components/ui/responsive-text';
import { ScalableSpacing } from '@/components/ui/scalable-spacing';

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
    where: { status: 'APPROVED' },
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
    <AdaptiveContainer maxWidth="default">
      <ScalableSpacing size="lg" />
      <ResponsiveText variant="h1" className="text-slate-900 mb-10">
        Отзывы
      </ResponsiveText>
      <ReviewsSection initialReviews={serialized} />
    </AdaptiveContainer>
  );
}
