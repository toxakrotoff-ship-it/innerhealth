'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { AddToCartButton } from '@/components/site/add-to-cart-button'

interface ProductCardProps {
  id: string
  title: string
  price: number
  priceOld?: number | null
  photo?: string | null
  slug?: string | null
  isPromoEligible?: boolean
  discountPrice?: number | null
  /** Set for above-the-fold images (e.g. first 2 products) to improve LCP */
  priority?: boolean
  /** Base64 blur placeholder from upload pipeline for placeholder="blur" */
  blurDataURL?: string | null
}

/** Weaker 3D tilt than TiltCard (factor 4), border transition, overlay; two actions: add to cart + details. */
export function ProductCard({
  id,
  title,
  price,
  priceOld,
  photo,
  slug,
  isPromoEligible = true,
  discountPrice = null,
  priority = false,
  blurDataURL = null,
}: ProductCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ rotateX: 0, rotateY: 0 })
  const detailHref = slug ? `/product/${slug}` : `/product/id/${id}`

  const updateStyles = () => {
    if (ref.current) {
      ref.current.style.setProperty('--r-x', `${state.current.rotateY}deg`)
      ref.current.style.setProperty('--r-y', `${state.current.rotateX}deg`)
    }
  }

  return (
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
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        const factor = 4
        state.current.rotateX = (0.5 - y) * factor
        state.current.rotateY = (x - 0.5) * factor
        updateStyles()
      }}
      onPointerLeave={() => {
        state.current.rotateX = 0
        state.current.rotateY = 0
        updateStyles()
      }}
    >
      <article
        className={cn(
          'relative flex h-full w-full flex-col rounded-2xl border border-gray-200 overflow-hidden',
          'bg-white shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out',
          'group-hover:shadow-md'
        )}
        style={{
          transform: 'rotateX(var(--r-y)) rotateY(var(--r-x))',
        }}
      >
        <div className="relative aspect-square bg-highlight-blue flex items-center justify-center overflow-hidden">
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
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
              placeholder={blurDataURL ? 'blur' : undefined}
              blurDataURL={blurDataURL ?? undefined}
              unoptimized={photo.startsWith('http://') || photo.startsWith('https://')}
            />
          ) : (
            <span className="text-action-blue/40 text-4xl font-light">?</span>
          )}
        </div>
        <div className="flex flex-1 min-h-0 min-w-0 flex-col p-4">
          <div className="flex-1 min-h-0 min-w-0">
            <h3 className="font-medium text-text line-clamp-2 group-hover:text-action-blue transition-colors">
              {title}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-semibold text-text">
                {price.toLocaleString('ru-RU')} ₽
              </span>
              {priceOld != null && priceOld > price && (
                <span className="text-sm text-gray-500 line-through">
                  {priceOld.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
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
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-text font-medium text-sm px-3 py-2 min-h-[36px] hover:bg-gray-50 hover:border-action-blue hover:text-action-blue transition-colors text-center"
            >
              Подробнее
            </Link>
          </div>
        </div>
        {/* Weak overlay: lighter than TiltCard, removed on hover */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-black/15 transition-opacity duration-300 group-hover:opacity-0"
          aria-hidden
        />
      </article>
    </div>
  )
}
