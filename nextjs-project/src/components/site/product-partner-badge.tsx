import { cn } from '@/lib/utils'

interface ProductPartnerBadgeProps {
  isPartner?: boolean
  className?: string
}

export function ProductPartnerBadge({ isPartner, className }: ProductPartnerBadgeProps) {
  if (!isPartner) return null

  return (
    <div
      className={cn(
        'inline-flex h-6 items-center justify-center rounded-full bg-action-blue px-2.5 text-center text-[11px] font-semibold leading-none text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]',
        className
      )}
      aria-label="Партнёрский продукт"
      title="Партнёрский продукт"
    >
      Партнёр
    </div>
  )
}
