'use client';

import { useRouter } from 'next/navigation';
import { ReviewsCarousel, type ReviewItem } from '@/components/site/reviews-carousel';
import { ReviewForm } from '@/components/site/review-form';
import { Heading2 } from '@/components/ui/responsive-text';
import { ScalableSpacing } from '@/components/ui/scalable-spacing';

interface ReviewsSectionProps {
  initialReviews: ReviewItem[];
}

export function ReviewsSection({ initialReviews }: ReviewsSectionProps) {
  const router = useRouter();

  return (
    <>
      <section>
        <Heading2 className="text-slate-900 mb-6">
          Отзывы наших клиентов
        </Heading2>
        <ReviewsCarousel reviews={initialReviews} />
      </section>
      <ScalableSpacing size="lg" />
      <section id="review-form" className="scroll-mt-6">
        <div className="bg-[#151C2C] rounded-[40px] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1/3 h-full bg-action-blue/10 blur-[100px] rounded-full pointer-events-none" aria-hidden />
          <div className="relative z-10 space-y-8">
            <div>
              <Heading2 className="text-white">
                Оставить отзыв
              </Heading2>
              <p className="mt-2 text-slate-400 font-light">
                Ваш отзыв появится на странице после модерации.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl max-w-3xl mx-auto">
              <ReviewForm onSuccess={() => router.refresh()} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
