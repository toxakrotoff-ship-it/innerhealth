import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Short trust cues near the primary purchase actions (Yandex / conversion).
 */
interface PurchaseTrustStripProps {
  isSprintTheme?: boolean
}

export function PurchaseTrustStrip({ isSprintTheme = false }: PurchaseTrustStripProps) {
  return (
    <div
      className={cn(
        'mt-4 rounded-xl border px-4 py-3 text-sm',
        isSprintTheme
          ? 'border-slate-700 bg-slate-900 text-slate-200'
          : 'border-emerald-100 bg-emerald-50/80 text-gray-800'
      )}
    >
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
        <li className="flex items-center gap-2">
          <span className={cn(isSprintTheme ? 'text-[#7AA2FF]' : 'text-emerald-700')} aria-hidden>
            ✓
          </span>
          <span>Оплата картой через ЮKassa</span>
        </li>
        <li className="flex items-center gap-2">
          <span className={cn(isSprintTheme ? 'text-[#7AA2FF]' : 'text-emerald-700')} aria-hidden>
            ✓
          </span>
          <Link
            href="/faq"
            className={cn('underline-offset-2 hover:underline', isSprintTheme ? 'text-[#9AB8FF]' : 'text-action-blue')}
          >
            Доставка по России (СДЭК)
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <span className={cn(isSprintTheme ? 'text-[#7AA2FF]' : 'text-emerald-700')} aria-hidden>
            ✓
          </span>
          <Link
            href="/oferta"
            className={cn('underline-offset-2 hover:underline', isSprintTheme ? 'text-[#9AB8FF]' : 'text-action-blue')}
          >
            Публичная оферта
          </Link>
        </li>
      </ul>
    </div>
  )
}
