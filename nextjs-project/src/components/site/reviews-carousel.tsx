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
  isSprintTheme?: boolean;
}

export function ReviewsCarousel({ reviews, isSprintTheme = false }: ReviewsCarouselProps) {
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
      <div
        className={`rounded-2xl p-8 text-center ${
          isSprintTheme
            ? 'border border-slate-700 bg-[#0F172A] text-slate-300'
            : 'border border-gray-200 bg-gray-50/50 text-gray-600'
        }`}
      >
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
            className="min-w-[280px] lg:min-w-[320px] 2xl:min-w-[360px] 3xl:min-w-[400px] max-w-[340px] lg:max-w-[400px] 2xl:max-w-[460px] 3xl:max-w-[520px] shrink-0 snap-center rounded-2xl border border-gray-200 bg-white p-6 lg:p-7 2xl:p-8 shadow-sm"
          >
            <p className="whitespace-pre-wrap text-[15px] font-normal leading-[1.5] text-slate-800 lg:text-base 2xl:text-lg">
              {review.text}
            </p>
            <div className="mt-4 flex items-center gap-3">
              {review.socialLink ? (
                <a
                  href={review.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-700 hover:underline lg:text-sm 2xl:text-base"
                >
                  {review.authorName}
                </a>
              ) : (
                <span className="text-[13px] font-semibold text-slate-500 lg:text-sm 2xl:text-base">
                  {review.authorName}
                </span>
              )}
            </div>
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
            className={`rounded-full p-2 disabled:opacity-40 ${
              isSprintTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
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
                  index === scrollIndex
                    ? 'bg-action-blue'
                    : isSprintTheme
                      ? 'bg-slate-600 hover:bg-slate-500'
                      : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Отзыв ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(reviews.length - 1, scrollIndex + 1))}
            disabled={scrollIndex === reviews.length - 1}
            className={`rounded-full p-2 disabled:opacity-40 ${
              isSprintTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
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
