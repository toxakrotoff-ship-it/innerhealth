'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { getProductImagePostprocessClasses } from '@/components/site/product-image-postprocess'
import { getPhotoTransformByUrl } from '@/lib/product-photo-transform'
import { cn } from '@/lib/utils'

export interface CategoryLineProductHighlightProps {
  id: string
  title: string
  price: number
  priceOld?: number | null
  photo?: string | null
  photos?: unknown
  slug?: string | null
  isPromoEligible?: boolean
  discountPrice?: number | null
  quantity?: number | null
  isPreorderEnabled?: boolean
}

/**
 * Горизонтальный блок «главный товар линейки» на странице категории Sprint.
 */
export function CategoryLineProductHighlight({
  id,
  title,
  price,
  priceOld,
  photo,
  photos,
  slug,
  isPromoEligible = true,
  discountPrice = null,
  quantity = null,
  isPreorderEnabled = false,
}: CategoryLineProductHighlightProps) {
  const detailHref = slug ? `/product/${slug}` : `/product/id/${id}`
  const isUnavailable = quantity != null && quantity <= 0 && !isPreorderEnabled
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

  return (
    <div className="mb-10 rounded-2xl border border-slate-700 bg-[#0F172A] p-4 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-stretch">
        <div className="relative mx-auto aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl bg-slate-800 md:mx-0 md:max-w-[200px]">
          {photoSrc ? (
            <Image
              src={photoSrc}
              alt={title}
              fill
              className={cn('z-10', photoFitClass)}
              style={
                photoTransform
                  ? {
                      objectPosition: '50% 50%',
                      transform: `translate(${photoTransform.x}%, ${photoTransform.y}%) scale(${photoTransform.zoom})`,
                    }
                  : undefined
              }
              sizes="(max-width: 768px) 70vw, 200px"
              unoptimized={
                !!photo && (photo.startsWith('http://') || photo.startsWith('https://'))
              }
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">Нет фото</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100 md:text-xl">{title}</h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-[#7AA2FF]">{price} ₽</span>
              {priceOld != null && priceOld > price ? (
                <span className="text-sm text-slate-500 line-through">{priceOld} ₽</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
              disabled={isUnavailable}
              className="rounded-full bg-[#7AA2FF] px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-[#9AB8FF] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Link
              href={detailHref}
              className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800"
            >
              Подробнее
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
