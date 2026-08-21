import { cn } from '@/lib/utils'

interface ProductDiscountBadgeProps {
  price: number
  priceOld?: number | null
  className?: string
}

function getDiscountPercent(price: number, priceOld?: number | null): number | null {
  if (priceOld == null || !Number.isFinite(priceOld) || !Number.isFinite(price)) return null
  if (priceOld <= 0 || price >= priceOld) return null

  const percent = Math.round(((priceOld - price) / priceOld) * 100)
  return percent > 0 ? percent : null
}

export function ProductDiscountBadge({
  price,
  priceOld,
  className,
}: ProductDiscountBadgeProps) {
  const percent = getDiscountPercent(price, priceOld)
  if (percent == null) return null

  return (
    <div
      className={cn(
        'inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-red-600 px-2 text-center text-xs font-semibold leading-none text-white shadow-[0_8px_20px_rgba(220,38,38,0.35)]',
        className
      )}
      aria-label={`Скидка ${percent}%`}
      title={`Скидка ${percent}%`}
    >
      -{percent}%
    </div>
  )
}
