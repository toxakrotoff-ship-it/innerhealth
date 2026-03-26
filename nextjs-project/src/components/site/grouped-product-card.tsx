'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { getProductImagePostprocessClasses } from '@/components/site/product-image-postprocess'
import { ProductQuickView } from '@/components/site/product-quick-view'
import { WishlistToggleButton } from '@/components/site/wishlist-toggle-button'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { cn } from '@/lib/utils'
import { getPhotoTransformByUrl } from '@/lib/product-photo-transform'
import type { ProductListingGroup } from '@/lib/product-grouping'

interface GroupedProductCardProps {
  group: ProductListingGroup
  priority?: boolean
}

export function GroupedProductCard({ group, priority = false }: GroupedProductCardProps) {
  const [selectedId, setSelectedId] = useState<string>(group.defaultVariantId)

  const activeVariant = useMemo(
    () => group.variants.find((variant) => variant.id === selectedId) ?? group.variants[0]!,
    [group.variants, selectedId]
  )
  const isUnavailable =
    activeVariant.quantity != null && activeVariant.quantity <= 0 && !activeVariant.isPreorderEnabled
  const detailHref = activeVariant.slug ? `/product/${activeVariant.slug}` : `/product/id/${activeVariant.id}`
  const isSprintTheme = activeVariant.brand === 'sprint-power'
  const activePhotoSrc = activeVariant.photo
    ? activeVariant.photo.startsWith('http://') || activeVariant.photo.startsWith('https://')
      ? activeVariant.photo
      : activeVariant.photo.startsWith('/')
        ? activeVariant.photo
        : `/${activeVariant.photo.replace(/^\//, '')}`
    : null
  const activePhotoTransform = getPhotoTransformByUrl(activeVariant.photos, activePhotoSrc)
  const activePhotoFitClass = activePhotoTransform
    ? activePhotoTransform.fitMode === 'cover'
      ? 'object-cover'
      : 'object-contain object-center'
    : getProductImagePostprocessClasses({ surface: 'catalog-card' })

  return (
    <ScrollReveal as="div" variant="fade-up">
      <article
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden rounded-2xl border',
          isSprintTheme ? 'border-slate-700/80 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white'
        )}
      >
        <div className={cn('relative aspect-3/4 overflow-hidden', isSprintTheme ? 'bg-slate-800' : 'bg-highlight-blue')}>
          <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
            <ProductQuickView
              id={activeVariant.id}
              title={group.baseTitle}
              price={activeVariant.price}
              priceOld={activeVariant.priceOld}
              photo={activeVariant.photo}
              slug={activeVariant.slug}
              isPromoEligible={activeVariant.isPromoEligible}
              discountPrice={activeVariant.discountPrice}
              quantity={activeVariant.quantity}
              isPreorderEnabled={activeVariant.isPreorderEnabled}
              iconOnly
            />
            <WishlistToggleButton productId={activeVariant.id} iconOnly />
          </div>
          {activePhotoSrc ? (
            <Image
              src={activePhotoSrc}
              alt={group.baseTitle}
              fill
              className={cn('z-10', activePhotoFitClass)}
              style={
                activePhotoTransform
                  ? {
                      objectPosition: '50% 50%',
                      transform: `translate(${activePhotoTransform.x}%, ${activePhotoTransform.y}%) scale(${activePhotoTransform.zoom})`,
                    }
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
              unoptimized={activeVariant.photo.startsWith('http://') || activeVariant.photo.startsWith('https://')}
            />
          ) : (
            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <span className="text-action-blue/40 text-4xl font-light">?</span>
            </div>
          )}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-2 2xl:px-3.5 2xl:py-2.5 3xl:px-4 3xl:py-3">
          <div className="flex-1 min-h-0 min-w-0">
            <h3
              className={cn(
                'line-clamp-2 text-sm font-medium transition-colors 2xl:text-[0.95rem] 3xl:text-base',
                isSprintTheme ? 'text-slate-100' : 'text-text'
              )}
            >
              {group.baseTitle}
            </h3>
            <div className="mt-1 min-h-[22px]">
              {group.flavorOptions.find((option) => option.id === activeVariant.id)?.label ? (
                <span
                  className={cn(
                    'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs line-clamp-1',
                    isSprintTheme ? 'bg-slate-700 text-slate-200' : 'bg-highlight-blue text-gray-700'
                  )}
                >
                  {group.flavorOptions.find((option) => option.id === activeVariant.id)?.label}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn('text-base font-semibold 2xl:text-lg 3xl:text-xl', isSprintTheme ? 'text-slate-100' : 'text-text')}>
                {activeVariant.price.toLocaleString('ru-RU')} ₽
              </span>
              {activeVariant.priceOld != null && activeVariant.priceOld > activeVariant.price && (
                <span className={cn('desktop-microtext-scale line-through', isSprintTheme ? 'text-slate-400' : 'text-gray-500')}>
                  {activeVariant.priceOld.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {group.flavorOptions.map((option) => {
                const isSelected = option.id === activeVariant.id
                const label = option.label ?? `Вкус ${group.flavorOptions.findIndex((item) => item.id === option.id) + 1}`
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedId(option.id)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                      isSelected
                        ? isSprintTheme
                          ? 'border-[#7AA2FF] bg-[#7AA2FF] text-slate-950'
                          : 'border-action-blue bg-action-blue text-gray-900'
                        : isSprintTheme
                          ? 'border-slate-600 text-slate-200 hover:border-slate-400'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    )}
                    aria-label={`Выбрать вариант ${label}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-2.5 flex min-w-0 flex-col gap-1.5 3xl:mt-3 3xl:gap-2">
            <AddToCartButton
              productId={activeVariant.id}
              title={activeVariant.title}
              price={activeVariant.price}
              photo={activeVariant.photo ?? null}
              slug={activeVariant.slug ?? null}
              hasPromoPrice={activeVariant.priceOld != null && activeVariant.priceOld > activeVariant.price}
              isPromoEligible={activeVariant.isPromoEligible}
              discountPrice={activeVariant.discountPrice}
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
                'desktop-button-scale inline-flex min-h-[40px] w-full shrink-0 items-center justify-center rounded-full border px-3 py-2 text-center text-sm font-medium transition-colors sm:min-h-[36px] 2xl:min-h-[40px] 2xl:text-[0.95rem] 3xl:min-h-[44px] 3xl:text-base',
                isSprintTheme
                  ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-[#7AA2FF] hover:bg-slate-700 hover:text-[#9AB8FF]'
                  : 'border-gray-300 bg-white text-text hover:border-action-blue hover:bg-gray-50 hover:text-action-blue'
              )}
            >
              Подробнее
            </Link>
          </div>
        </div>
      </article>
    </ScrollReveal>
  )
}
