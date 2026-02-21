'use client'

import { useSearchParams } from 'next/navigation'

/**
 * Показывает сообщение при возврате с страницы оплаты ЮKassa
 * (return_url: /cart?payment=success или /cart?payment=cancel).
 * Читает query на клиенте, чтобы не передавать searchParams (Promise) в пропсы страницы и не вызывать предупреждение sync-dynamic-apis в dev tools.
 */
export function CartReturnMessage() {
  const searchParams = useSearchParams()
  const payment = searchParams.get('payment') ?? undefined

  if (payment === 'success') {
    return (
      <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="font-medium text-green-800">Оплата прошла успешно</p>
        <p className="mt-1 text-sm text-green-700">
          Заказ принят в обработку. Мы свяжемся с вами для подтверждения доставки.
        </p>
      </div>
    )
  }

  if (payment === 'cancel') {
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="font-medium text-amber-800">Оплата отменена</p>
        <p className="mt-1 text-sm text-amber-700">
          Вы можете оформить заказ снова или вернуться в каталог.
        </p>
      </div>
    )
  }

  return null
}
