'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';

export interface ReviewItem {
  id: string;
  authorName: string;
  socialLink: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: string;
}

interface ReviewsCarouselProps {
  reviews: ReviewItem[];
}

export function ReviewsCarousel({ reviews }: ReviewsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      setScrollIndex(index);
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || reviews.length === 0) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.offsetWidth;
    const index = Math.round(scrollLeft / cardWidth);
    setScrollIndex(Math.min(index, reviews.length - 1));
  }, [reviews.length]);

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8 text-center text-gray-600">
        Пока нет отзывов. Будьте первым — оставьте отзыв ниже.
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-thin"
        style={{ scrollbarWidth: 'thin' }}
      >
        {reviews.map((review, index) => (
          <article
            key={review.id}
            data-index={index}
            className="min-w-[280px] max-w-[340px] shrink-0 snap-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              {review.socialLink ? (
                <a
                  href={review.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-action-blue hover:underline"
                >
                  {review.authorName}
                </a>
              ) : (
                <span className="font-semibold text-gray-900">{review.authorName}</span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-gray-700">{review.text}</p>
            {review.imageUrl && (
              <div className="mt-4 overflow-hidden rounded-xl">
                <Image
                  src={review.imageUrl}
                  alt=""
                  width={320}
                  height={240}
                  className="h-auto w-full object-cover"
                  unoptimized={review.imageUrl.startsWith('/uploads/')}
                />
              </div>
            )}
          </article>
        ))}
      </div>
      {reviews.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => scrollTo(Math.max(0, scrollIndex - 1))}
            disabled={scrollIndex === 0}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Предыдущий отзыв"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-1">
            {reviews.map((r, index) => (
              <button
                key={r.id}
                type="button"
                onClick={() => scrollTo(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === scrollIndex ? 'bg-action-blue' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Отзыв ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(reviews.length - 1, scrollIndex + 1))}
            disabled={scrollIndex === reviews.length - 1}
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Следующий отзыв"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
