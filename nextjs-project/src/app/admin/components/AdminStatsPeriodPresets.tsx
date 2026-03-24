'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type PeriodKey = '7d' | '30d' | '90d' | 'all'

const PRESETS: ReadonlyArray<{ key: PeriodKey; label: string }> = [
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: '90d', label: '90 дней' },
  { key: 'all', label: 'Всё время' },
]

function buildPresetHref(adminBasePath: string, key: PeriodKey): string {
  if (key === '30d') return adminBasePath
  const params = new URLSearchParams()
  params.set('period', key)
  return `${adminBasePath}?${params.toString()}`
}

interface AdminStatsPeriodPresetsProps {
  adminBasePath: string
  period: PeriodKey
}

/**
 * Пресеты периода статистики: SPA-навигация без полной перезагрузки документа.
 */
export function AdminStatsPeriodPresets({ adminBasePath, period }: AdminStatsPeriodPresetsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div
      className={cn(
        'inline-flex w-full flex-wrap rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto transition-opacity duration-200',
        isPending && 'pointer-events-none opacity-60'
      )}
      aria-busy={isPending}
    >
      {PRESETS.map((item) => {
        const isActive = period === item.key
        return (
          <button
            key={item.key}
            type="button"
            disabled={isPending}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => {
              const href = buildPresetHref(adminBasePath, item.key)
              startTransition(() => {
                router.push(href, { scroll: false })
              })
            }}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
              isActive
                ? 'border border-gray-200 bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
