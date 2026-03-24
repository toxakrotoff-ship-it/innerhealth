import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { ReviewsSection } from './reviews-section'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading1 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getServerBrandContext } from '@/lib/brand/brand-server'

export const revalidate = 1800

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: 'Отзывы',
    description: `Отзывы покупателей ${siteTitle} о нутриентах, доставке и сервисе. Реальные мнения клиентов магазина.`,
    alternates: { canonical: '/otzyvy' },
    openGraph: {
      title: `Отзывы | ${siteTitle}`,
      description: `Читайте отзывы о товарах и работе магазина ${siteTitle}.`,
      url: '/otzyvy',
    },
  }
}

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
      <Heading1 className="text-slate-900 mb-10">
        Отзывы
      </Heading1>
      <ReviewsSection initialReviews={serialized} />
    </AdaptiveContainer>
  );
}
