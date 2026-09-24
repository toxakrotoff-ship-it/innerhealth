'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  getBaseTitleAndFlavorLabel,
  getVariantOptionKind,
  sortVariantsForDisplay,
  type ProductVariantForListing,
} from '@/lib/product-grouping'

const FORMAT_LABEL_CATEGORY_SLUGS = new Set(['gribnaya-kollekciya'])

interface ProductFlavorSelectorProps {
  activeProductId: string
  variants: ProductVariantForListing[]
  isSprintTheme: boolean
  categorySlug?: string | null
}

function isVariantUnavailable(variant: ProductVariantForListing): boolean {
  return variant.quantity != null && variant.quantity <= 0 && !variant.isPreorderEnabled
}

export function ProductFlavorSelector({
  activeProductId,
  variants,
  isSprintTheme,
  categorySlug,
}: ProductFlavorSelectorProps) {
  const isSizeGroup = getVariantOptionKind(variants) === 'size'
  const groupLabel = isSizeGroup
    ? 'Фасовка'
    : categorySlug && FORMAT_LABEL_CATEGORY_SLUGS.has(categorySlug)
      ? 'Формат'
      : 'Вкус'
  const options = useMemo(() => {
    return sortVariantsForDisplay(variants).map((variant, index) => {
      const { flavorLabel } = getBaseTitleAndFlavorLabel(variant.title)
      const weightLabel =
        typeof variant.weight === 'number' && variant.weight > 0 ? `${variant.weight} г` : null
      const label =
        flavorLabel ??
        weightLabel ??
        (variant.sku?.trim() ? variant.sku.trim() : `${groupLabel} ${index + 1}`)
      const href = variant.slug ? `/product/${variant.slug}` : `/product/id/${variant.id}`
      return {
        id: variant.id,
        href,
        label,
        isUnavailable: isVariantUnavailable(variant),
      }
    })
  }, [variants, groupLabel])

  if (options.length <= 1) return null

  return (
    <div className="mt-4">
      <div className={cn('text-xs font-medium', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>{groupLabel}</div>
      <div className="mt-2 flex flex-wrap gap-2 md:gap-2.5">
        {options.map((option) => {
          const isActive = option.id === activeProductId
          return (
            <Link
              key={option.id}
              href={option.href}
              prefetch
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={option.isUnavailable ? true : undefined}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors md:px-3.5 md:py-1.5 md:text-[0.95rem] 2xl:px-4 2xl:text-base',
                option.isUnavailable && 'opacity-60',
                isActive
                  ? isSprintTheme
                    ? 'border-[#7AA2FF] bg-[#7AA2FF] text-slate-950'
                    : 'border-action-blue bg-action-blue text-gray-900'
                  : isSprintTheme
                    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400'
                    : 'border-gray-300 bg-white text-text hover:border-gray-400'
              )}
              title={option.isUnavailable ? `Нет в наличии — ${option.label}` : option.label}
            >
              {option.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
