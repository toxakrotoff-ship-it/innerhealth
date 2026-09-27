'use client'

import { useEffect, useState } from 'react'
import {
  PAYMENT_REDIRECT_UPDATED_EVENT,
  readPendingPaymentRedirect,
  type PendingPaymentRedirect,
} from '@/lib/payment-redirect-recovery'

export function PaymentRedirectRecovery({ payment, brandId }: { payment?: string; brandId: string }) {
  const [pending, setPending] = useState<PendingPaymentRedirect | null>(null)

  useEffect(() => {
    const refresh = () => setPending(readPendingPaymentRedirect())
    refresh()
    window.addEventListener(PAYMENT_REDIRECT_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(PAYMENT_REDIRECT_UPDATED_EVENT, refresh)
  }, [])

  if (payment === 'success' || !pending || pending.brandId !== brandId) return null

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-900">
      <p className="font-medium">Не открылась страница оплаты?</p>
      <p className="mt-1 text-sm">Попробуйте снова открыть оплату созданного заказа, прежде чем оформлять новый.</p>
      <a href={pending.url} className="mt-3 inline-block rounded-full bg-action-blue px-5 py-2 font-medium text-gray-900">
        Открыть страницу оплаты
      </a>
    </div>
  )
}
