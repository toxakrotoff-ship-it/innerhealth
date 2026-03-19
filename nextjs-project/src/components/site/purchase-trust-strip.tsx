import Link from 'next/link'

/**
 * Short trust cues near the primary purchase actions (Yandex / conversion).
 */
export function PurchaseTrustStrip() {
  return (
    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-gray-800">
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1">
        <li className="flex items-center gap-2">
          <span className="text-emerald-700" aria-hidden>
            ✓
          </span>
          <span>Оплата картой через ЮKassa</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-700" aria-hidden>
            ✓
          </span>
          <Link href="/faq" className="underline-offset-2 hover:underline text-action-blue">
            Доставка по России (СДЭК)
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-emerald-700" aria-hidden>
            ✓
          </span>
          <Link href="/oferta" className="underline-offset-2 hover:underline text-action-blue">
            Публичная оферта
          </Link>
        </li>
      </ul>
    </div>
  )
}
