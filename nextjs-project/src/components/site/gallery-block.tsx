"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

const GALLERY_IMAGES = [
  { src: "/images/gallery/gallery-1.png", alt: "Фото 1" },
  { src: "/images/gallery/gallery-2.png", alt: "Фото 2" },
  { src: "/images/gallery/gallery-3.png", alt: "Фото 3" },
] as const

export function GalleryBlock() {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const openAt = useCallback((index: number) => {
    setCurrentIndex(index)
    setLightboxOpen(true)
  }, [])

  const close = useCallback(() => setLightboxOpen(false), [])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i <= 0 ? GALLERY_IMAGES.length - 1 : i - 1))
  }, [])

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i >= GALLERY_IMAGES.length - 1 ? 0 : i + 1))
  }, [])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [lightboxOpen, close, goPrev, goNext])

  useEffect(() => {
    if (lightboxOpen) document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [lightboxOpen])

  const current = GALLERY_IMAGES[currentIndex]

  return (
    <>
      <section className="py-12 bg-white" aria-label="Галерея">
        <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {GALLERY_IMAGES.map((img, index) => (
              <button
                type="button"
                key={img.src}
                onClick={() => openAt(index)}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 bg-soft-background cursor-zoom-in text-left focus:outline-none focus:ring-2 focus:ring-action-blue focus:ring-offset-2"
                aria-label={`Открыть ${img.alt} в полном размере`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={index === 0}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр изображения"
          onClick={close}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Предыдущее изображение"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.src}
              alt={current.alt}
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
              sizes="90vw"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Следующее изображение"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {currentIndex + 1} / {GALLERY_IMAGES.length}
          </span>
        </div>
      )}
    </>
  )
}
