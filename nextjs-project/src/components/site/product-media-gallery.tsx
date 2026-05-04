'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useModalPresence } from '@/components/ui/modal-layer'
import { getProductImagePostprocessClasses } from '@/components/site/product-image-postprocess'
import type { ProductGalleryPhoto } from '@/lib/product-gallery'

interface ProductMediaGalleryProps {
  title: string
  photos: ProductGalleryPhoto[]
  /** Same layout as Inner; surfaces and thumb borders use Sprint palette when true */
  isSprintTheme?: boolean
}

export function ProductMediaGallery({ title, photos, isSprintTheme = false }: ProductMediaGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const { mounted: lightboxMounted, visible: lightboxVisible } = useModalPresence(isLightboxOpen)

  useEffect(() => {
    if (!lightboxMounted) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsLightboxOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxMounted])

  useEffect(() => {
    if (!lightboxMounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lightboxMounted])

  const active = photos[activeIndex]
  const activePhotoFitClass = active?.transform
    ? active.transform.fitMode === 'cover'
      ? 'object-cover'
      : 'object-contain object-center'
    : getProductImagePostprocessClasses({ surface: 'gallery-main' })

  const mainSurface = isSprintTheme
    ? 'bg-slate-800/90 ring-1 ring-slate-700/80'
    : 'bg-highlight-blue'
  const thumbInactiveBorder = isSprintTheme ? 'border-slate-600' : 'border-gray-200'
  const thumbActiveBorder = isSprintTheme ? 'border-[#7AA2FF]' : 'border-action-blue'

  if (!active) {
    return (
      <div
        className={cn(
          'relative aspect-3/4 max-w-md mx-auto lg:mx-0 rounded-2xl flex items-center justify-center overflow-hidden',
          mainSurface
        )}
      >
        <span
          className={cn('text-6xl', isSprintTheme ? 'text-[#7AA2FF]/35' : 'text-action-blue/40')}
          aria-hidden
        >
          ?
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          className={cn(
            'relative block aspect-3/4 w-full max-w-md mx-auto lg:mx-0 rounded-2xl overflow-hidden',
            mainSurface
          )}
          onClick={() => setIsLightboxOpen(true)}
          aria-label="Открыть изображение крупнее"
        >
          <Image
            src={active.url}
            alt={title}
            fill
            className={cn('z-10 transition-transform duration-200 hover:scale-105', activePhotoFitClass)}
            style={
              active.transform
                ? {
                    objectPosition: '50% 50%',
                    transform: `translate(${active.transform.x}%, ${active.transform.y}%) scale(${active.transform.zoom})`,
                  }
                : undefined
            }
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
                  index === activeIndex ? thumbActiveBorder : thumbInactiveBorder
                )}
                onClick={() => setActiveIndex(index)}
                aria-label={`Показать фото ${index + 1}`}
              >
                <Image
                  src={photo.url}
                  alt={`${title} — фото ${index + 1}`}
                  fill
                  className="object-contain object-center"
                  sizes="64px"
                  unoptimized={photo.url.startsWith('http://') || photo.url.startsWith('https://')}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxMounted && (
        <div
          className={cn(
            'fixed inset-0 z-120 flex items-center justify-center bg-black/85 px-4 transition-opacity duration-220 ease-out motion-reduce:transition-none',
            lightboxVisible ? 'opacity-100' : 'opacity-0'
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            type="button"
            className="absolute inset-0 z-0 cursor-default"
            aria-label="Закрыть"
            onClick={() => setIsLightboxOpen(false)}
          />
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Закрыть"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative z-10 aspect-4/3 w-full max-w-5xl">
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
