'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AddToCartButton } from '@/components/site/add-to-cart-button';
import { CompareToggleButton } from '@/components/site/compare-toggle-button';

interface ProductQuickViewProps {
  id: string;
  title: string;
  price: number;
  priceOld?: number | null;
  photo?: string | null;
  slug?: string | null;
  isPromoEligible?: boolean;
  discountPrice?: number | null;
  iconOnly?: boolean;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function ProductQuickView({
  id,
  title,
  price,
  priceOld,
  photo,
  slug,
  isPromoEligible,
  discountPrice,
  iconOnly = false,
}: ProductQuickViewProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [description, setDescription] = useState<string>('');
  const [loadingDescription, setLoadingDescription] = useState(false);
  const detailHref = slug ? `/product/${slug}` : `/product/id/${id}`;
  const descriptionPreview = useMemo(() => {
    if (!description) return '';
    const plain = stripHtml(description);
    if (plain.length <= 220) return plain;
    return `${plain.slice(0, 220).trim()}...`;
  }, [description]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open || description) return;

    const controller = new AbortController();
    setLoadingDescription(true);
    fetch(`/api/products/quick-view?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { description?: string | null }) => {
        if (data && typeof data.description === 'string') {
          setDescription(data.description);
        } else {
          setDescription('');
        }
      })
      .catch(() => setDescription(''))
      .finally(() => setLoadingDescription(false));

    return () => controller.abort();
  }, [open, id, description]);

  const modalContent =
    open && isMounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-2xl xl:max-w-3xl 2xl:max-w-4xl 3xl:max-w-5xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <h3 className="text-base font-semibold text-text">Быстрый просмотр</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)]">
                <div className="relative aspect-square rounded-xl bg-highlight-blue overflow-hidden">
                  {photo ? (
                    <Image
                      src={
                        photo.startsWith('http://') || photo.startsWith('https://')
                          ? photo
                          : photo.startsWith('/')
                            ? photo
                            : `/${photo.replace(/^\//, '')}`
                      }
                      alt={title}
                      fill
                      className="object-contain p-3"
                      unoptimized={photo.startsWith('http://') || photo.startsWith('https://')}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-action-blue/40 text-4xl">?</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-lg lg:text-xl 2xl:text-2xl 3xl:text-3xl font-semibold text-text">{title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xl font-semibold text-text">{price.toLocaleString('ru-RU')} ₽</span>
                    {priceOld != null && priceOld > price && (
                      <span className="text-sm text-gray-500 line-through">{priceOld.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {loadingDescription ? 'Загрузка описания...' : descriptionPreview || 'Краткое описание отсутствует.'}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <AddToCartButton
                      productId={id}
                      title={title}
                      price={price}
                      photo={photo ?? null}
                      slug={slug ?? null}
                      hasPromoPrice={priceOld != null && priceOld > price}
                      isPromoEligible={isPromoEligible}
                      discountPrice={discountPrice}
                      size="sm"
                    />
                    <Link
                      href={detailHref}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text hover:border-action-blue hover:text-action-blue transition-colors"
                    >
                      Подробнее
                    </Link>
                    <CompareToggleButton productId={id} compact />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          iconOnly
            ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:border-action-blue hover:text-action-blue transition-colors'
            : 'inline-flex shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-text font-medium text-sm px-3 py-2 min-h-[36px] hover:bg-gray-50 hover:border-action-blue hover:text-action-blue transition-colors'
        }
        aria-label="Быстрый просмотр"
        title="Быстрый просмотр"
      >
        {iconOnly ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M1.5 12s3.75-6 10.5-6 10.5 6 10.5 6-3.75 6-10.5 6-10.5-6-10.5-6z" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ) : (
          'Быстрый просмотр'
        )}
      </button>
      {modalContent}
    </>
  );
}
