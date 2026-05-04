import { normalizeBrandId } from '@/lib/brand/brand'

export interface AccountOrderStorefrontBadgeProps {
  brand: string | null | undefined
  className?: string
}

/** Подпись витрины по `Order.brand` (inner | sprint-power). */
export function AccountOrderStorefrontBadge({
  brand,
  className = '',
}: AccountOrderStorefrontBadgeProps) {
  const id = normalizeBrandId(brand) ?? 'inner'
  const label = id === 'sprint-power' ? 'Sprint Power' : 'Inner Health'
  const pillClass =
    id === 'sprint-power'
      ? 'border-violet-200 bg-violet-50 text-violet-800'
      : 'border-gray-200 bg-gray-50 text-gray-700'
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-medium ${pillClass} ${className}`.trim()}
      title="Витрина, с которой оформлен заказ"
    >
      {label}
    </span>
  )
}
