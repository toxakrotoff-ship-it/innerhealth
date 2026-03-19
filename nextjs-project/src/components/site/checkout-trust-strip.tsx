import Link from 'next/link'

/**
 * Reassurance block above checkout form (cart page).
 */
export function CheckoutTrustStrip() {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
      <p className="font-medium text-text mb-2">Перед оформлением</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Безопасная оплата на стороне ЮKassa — данные карты не хранятся на сайте.
        </li>
        <li>
          Доставка СДЭК по РФ —{' '}
          <Link href="/faq" className="text-action-blue underline-offset-2 hover:underline">
            ответы в разделе «Вопросы»
          </Link>
          .
        </li>
        <li>
          Условия покупки —{' '}
          <Link href="/oferta" className="text-action-blue underline-offset-2 hover:underline">
            публичная оферта
          </Link>
          , персональные данные —{' '}
          <Link href="/privacy" className="text-action-blue underline-offset-2 hover:underline">
            политика конфиденциальности
          </Link>
          .
        </li>
      </ul>
    </div>
  )
}
