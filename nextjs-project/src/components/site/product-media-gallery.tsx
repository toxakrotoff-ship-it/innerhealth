'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { ProductGalleryPhoto } from '@/lib/product-gallery'

interface ProductMediaGalleryProps {
  title: string
  photos: ProductGalleryPhoto[]
}

export function ProductMediaGallery({ title, photos }: ProductMediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const active = photos[activeIndex]

  if (!active) {
    return (
      <div className="relative aspect-square max-w-md mx-auto lg:mx-0 rounded-2xl bg-highlight-blue flex items-center justify-center overflow-hidden">
        <span className="text-action-blue/40 text-6xl">?</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          className="relative block aspect-square w-full max-w-md mx-auto lg:mx-0 rounded-2xl bg-highlight-blue overflow-hidden"
          onClick={() => setIsLightboxOpen(true)}
          aria-label="Открыть изображение крупнее"
        >
          <Image
            src={active.url}
            alt={title}
            fill
            className="object-contain p-6 transition-transform duration-200 hover:scale-105"
            sizes="(max-width: 1024px) 92vw, 44vw"
            priority
            placeholder={active.blurDataURL ? 'blur' : undefined}
            blurDataURL={active.blurDataURL}
            unoptimized={active.url.startsWith('http://') || active.url.startsWith('https://')}
          />
        </button>
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo, index) => (
              <button
                key={`${photo.url}-${index}`}
                type="button"
                className={cn(
                  'relative h-16 w-16 shrink-0 rounded-lg border overflow-hidden',
                  index === activeIndex ? 'border-action-blue' : 'border-gray-200'
                )}
                onClick={() => setActiveIndex(index)}
                aria-label={`Показать фото ${index + 1}`}
              >
                <Image
                  src={photo.url}
                  alt={`${title} — фото ${index + 1}`}
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                  unoptimized={photo.url.startsWith('http://') || photo.url.startsWith('https://')}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {isLightboxOpen && (
        <div className="fixed inset-0 z-[120] bg-black/85 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 text-white p-2 hover:bg-white/20"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full max-w-5xl aspect-[4/3]">
            <Image
              src={active.url}
              alt={title}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized={active.url.startsWith('http://') || active.url.startsWith('https://')}
            />
          </div>
        </div>
      )}
    </>
  )
}
