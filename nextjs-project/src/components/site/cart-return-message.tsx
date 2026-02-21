'use client'

import { use } from 'react'

interface CartReturnMessageProps {
  searchParams: Promise<{ payment?: string }>
}

/**
 * Показывает сообщение при возврате с страницы оплаты ЮKassa
 * (return_url: /cart?payment=success или /cart?payment=cancel).
 */
export function CartReturnMessage({ searchParams }: CartReturnMessageProps) {
  const params = use(searchParams)
  const payment = params.payment

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
