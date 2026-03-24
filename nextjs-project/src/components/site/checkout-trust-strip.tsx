import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Reassurance block above checkout form (cart page).
 */
interface CheckoutTrustStripProps {
  isSprintTheme?: boolean
}

export function CheckoutTrustStrip({ isSprintTheme = false }: CheckoutTrustStripProps) {
  return (
    <div
      className={cn(
        'mb-6 rounded-xl border px-4 py-3 text-sm shadow-sm',
        isSprintTheme ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-gray-200 bg-white text-gray-700'
      )}
    >
      <p className={cn('mb-2 font-medium', isSprintTheme ? 'text-slate-100' : 'text-text')}>Перед оформлением</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Безопасная оплата на стороне ЮKassa — данные карты не хранятся на сайте.
        </li>
        <li>
          Доставка СДЭК по РФ —{' '}
          <Link
            href="/faq"
            className={cn('underline-offset-2 hover:underline', isSprintTheme ? 'text-[#9AB8FF]' : 'text-action-blue')}
          >
            ответы в разделе «Вопросы»
          </Link>
          .
        </li>
        <li>
          Условия покупки —{' '}
          <Link
            href="/oferta"
            className={cn('underline-offset-2 hover:underline', isSprintTheme ? 'text-[#9AB8FF]' : 'text-action-blue')}
          >
            публичная оферта
          </Link>
          , персональные данные —{' '}
          <Link
            href="/privacy"
            className={cn('underline-offset-2 hover:underline', isSprintTheme ? 'text-[#9AB8FF]' : 'text-action-blue')}
          >
            политика конфиденциальности
          </Link>
          .
        </li>
      </ul>
    </div>
  )
}
