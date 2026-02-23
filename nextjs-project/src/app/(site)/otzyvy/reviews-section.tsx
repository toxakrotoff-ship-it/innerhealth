'use client';

import { useRouter } from 'next/navigation';
import { ReviewsCarousel, type ReviewItem } from '@/components/site/reviews-carousel';
import { ReviewForm } from '@/components/site/review-form';

interface ReviewsSectionProps {
  initialReviews: ReviewItem[];
}

export function ReviewsSection({ initialReviews }: ReviewsSectionProps) {
  const router = useRouter();

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-4 text-lg font-semibold text-text">Отзывы наших клиентов</h2>
        <ReviewsCarousel reviews={initialReviews} />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-text">Оставить отзыв</h2>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <ReviewForm onSuccess={() => router.refresh()} />
        </div>
      </section>
    </div>
  );
}
