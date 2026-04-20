'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { WishlistToggleButton } from '@/components/site/wishlist-toggle-button'
import { ProductQuickView } from '@/components/site/product-quick-view'
import { getProductImagePostprocessClasses } from '@/components/site/product-image-postprocess'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { getPhotoTransformByUrl } from '@/lib/product-photo-transform'

interface ProductCardProps {
  id: string
  title: string
  brand?: string | null
  sku?: string | null
  showSku?: boolean
  price: number
  priceOld?: number | null
  photo?: string | null
  photos?: unknown
  slug?: string | null
  isPromoEligible?: boolean
  discountPrice?: number | null
  quantity?: number | null
  isPreorderEnabled?: boolean
  /** Set for above-the-fold images (e.g. first 2 products) to improve LCP */
  priority?: boolean
  /** Base64 blur placeholder from upload pipeline for placeholder="blur" */
  blurDataURL?: string | null
}

/** Weaker 3D tilt than TiltCard (factor 4), border transition, overlay; two actions: add to cart + details. */
export function ProductCard({
  id,
  title,
  brand,
  sku,
  showSku = true,
  price,
  priceOld,
  photo,
  photos,
  slug,
  isPromoEligible = true,
  discountPrice = null,
  quantity = null,
  isPreorderEnabled = false,
  priority = false,
  blurDataURL = null,
}: ProductCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ rotateX: 0, rotateY: 0 })
  const detailHref = slug ? `/product/${slug}` : `/product/id/${id}`
  const isUnavailable = quantity != null && quantity <= 0 && !isPreorderEnabled
  const normalizedBrand = (brand ?? '').trim().toLowerCase()
  const isSprintTheme = normalizedBrand === 'sprint-power' || normalizedBrand.includes('sprint')
  const photoSrc = photo
    ? photo.startsWith('http://') || photo.startsWith('https://')
      ? photo
      : photo.startsWith('/')
        ? photo
        : `/${photo.replace(/^\//, '')}`
    : null
  const photoTransform = getPhotoTransformByUrl(photos, photoSrc)
  const photoFitClass = photoTransform
    ? photoTransform.fitMode === 'cover'
      ? 'object-cover'
      : 'object-contain object-center'
    : getProductImagePostprocessClasses({ surface: 'catalog-card' })

  const mobilePhotoFitClass = cn('max-sm:object-cover max-sm:object-center')

  const updateStyles = () => {
    if (ref.current) {
      ref.current.style.setProperty('--r-x', `${state.current.rotateY}deg`)
      ref.current.style.setProperty('--r-y', `${state.current.rotateX}deg`)
    }
  }

  return (
    <ScrollReveal as="div" variant="fade-up">
      <div
        ref={ref}
        className="group block h-full w-full perspective-[600px]"
        style={
          {
            '--r-x': '0deg',
            '--r-y': '0deg',
          } as React.CSSProperties
        }
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) / rect.width
          const y = (e.clientY - rect.top) / rect.height
          const factor = 4
          state.current.rotateX = (0.5 - y) * factor
          state.current.rotateY = (x - 0.5) * factor
          updateStyles()
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'mouse') return
          state.current.rotateX = 0
          state.current.rotateY = 0
          updateStyles()
        }}
      >
      <article
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden rounded-2xl border transition-[transform,border-color,box-shadow] duration-200 ease-out max-sm:flex-row',
          isSprintTheme
            ? 'border-slate-700/80 bg-slate-900 shadow-[0_10px_30px_rgba(2,6,23,0.45)] group-hover:border-[#7AA2FF]/70 group-hover:shadow-[0_16px_40px_rgba(2,6,23,0.65)]'
            : 'border-gray-200 bg-white shadow-sm group-hover:shadow-md'
        )}
        style={{
          transform: 'rotateX(var(--r-y)) rotateY(var(--r-x))',
        }}
      >
        <div
          className={cn(
            'relative aspect-3/4 overflow-hidden',
            'max-sm:w-[40%] max-sm:shrink-0 max-[360px]:w-[36%]',
            isSprintTheme ? 'bg-slate-800 max-sm:bg-slate-900' : 'bg-highlight-blue max-sm:bg-white'
          )}
        >
          <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
            <ProductQuickView
              id={id}
              title={title}
              price={price}
              priceOld={priceOld}
              photo={photo}
              slug={slug}
              isPromoEligible={isPromoEligible}
              discountPrice={discountPrice}
              quantity={quantity}
              isPreorderEnabled={isPreorderEnabled}
              iconOnly
            />
            <WishlistToggleButton productId={id} iconOnly />
          </div>
          {photo ? (
            <Image
              src={photoSrc!}
              alt={title}
              fill
              className={cn('z-10', photoFitClass, mobilePhotoFitClass)}
              style={
                photoTransform
                  ? {
                      objectPosition: '50% 50%',
                      transform: `translate(${photoTransform.x}%, ${photoTransform.y}%) scale(${photoTransform.zoom})`,
                    }
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
              placeholder={blurDataURL ? 'blur' : undefined}
              blurDataURL={blurDataURL ?? undefined}
              unoptimized={photo.startsWith('http://') || photo.startsWith('https://')}
            />
          ) : (
            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <span className="text-action-blue/40 text-4xl font-light">?</span>
            </div>
          )}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-2 max-sm:gap-2 max-sm:py-3 2xl:px-3.5 2xl:py-2.5 3xl:px-4 3xl:py-3">
          <div className="min-h-0 min-w-0 max-sm:flex max-sm:items-start max-sm:justify-between max-sm:gap-3">
            <h3
              className={cn(
                'min-w-0 max-w-full line-clamp-2 break-words hyphens-auto text-sm font-medium transition-colors max-sm:line-clamp-none 2xl:text-[0.95rem] 3xl:text-base',
                isSprintTheme ? 'text-slate-100 group-hover:text-[#7AA2FF]' : 'text-text group-hover:text-action-blue'
              )}
            >
              {title}
            </h3>

            <div className="mt-0 flex shrink-0 items-baseline gap-2 max-sm:pt-0.5">
              <span className={cn('text-base font-semibold 2xl:text-lg 3xl:text-xl', isSprintTheme ? 'text-slate-100' : 'text-text')}>
                {price.toLocaleString('ru-RU')} ₽
              </span>
              {priceOld != null && priceOld > price && (
                <span className={cn('desktop-microtext-scale line-through', isSprintTheme ? 'text-slate-500' : 'text-gray-500')}>
                  {priceOld.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
          </div>

          {showSku && sku?.trim() && (
            <p
              className={cn(
                'desktop-microtext-scale -mt-1 min-w-0 max-w-full line-clamp-1 overflow-hidden text-ellipsis',
                isSprintTheme ? 'text-slate-400' : 'text-gray-500'
              )}
            >
              SKU: {sku.trim()}
            </p>
          )}

          <div className="mt-2.5 flex min-w-0 flex-col gap-1.5 max-sm:mt-0 3xl:mt-3 3xl:gap-2">
            <AddToCartButton
              productId={id}
              title={title}
              price={price}
              photo={photo ?? null}
              slug={slug ?? null}
              hasPromoPrice={priceOld != null && priceOld > price}
              isPromoEligible={isPromoEligible}
              discountPrice={discountPrice}
              disabled={isUnavailable}
              size="sm"
              className={cn(
                'desktop-button-scale min-h-[40px] w-full sm:min-h-[36px] 2xl:min-h-[40px] 3xl:min-h-[44px]',
                isSprintTheme && 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]'
              )}
            />
            <Link
              href={detailHref}
              className={cn(
                'desktop-button-scale inline-flex min-h-[40px] w-full shrink-0 items-center justify-center rounded-full border px-3 py-2 text-center text-sm leading-tight font-medium transition-colors sm:min-h-[36px] 2xl:min-h-[40px] 2xl:text-[0.95rem] 3xl:min-h-[44px] 3xl:text-base',
                isSprintTheme
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-[#7AA2FF] hover:bg-slate-700 hover:text-[#9AB8FF]'
                  : 'border-gray-300 bg-white text-text hover:border-action-blue hover:bg-gray-50 hover:text-action-blue'
              )}
            >
              Подробнее
            </Link>
          </div>
        </div>
        {/* Weak overlay: lighter than TiltCard, removed on hover */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 group-hover:opacity-0',
            isSprintTheme ? 'bg-slate-950/10 md:bg-slate-950/25' : 'bg-black/6 md:bg-black/15'
          )}
          aria-hidden
        />
      </article>
      </div>
    </ScrollReveal>
  )
}
