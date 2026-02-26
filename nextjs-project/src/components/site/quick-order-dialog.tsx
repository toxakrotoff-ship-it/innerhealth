'use client'

import { useState } from 'react'

interface QuickOrderDialogProps {
  productId: string
  productTitle: string
}

export function QuickOrderDialog({ productId, productTitle }: QuickOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/quick-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: 1,
          name,
          phone,
          comment,
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Не удалось отправить заявку')

      setMessage(`Заявка на товар "${productTitle}" отправлена. Мы скоро с вами свяжемся.`)
      setName('')
      setPhone('')
      setComment('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ошибка отправки заявки')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white text-text font-medium hover:bg-gray-50 transition-colors px-5 py-3 min-h-[44px]"
      >
        Купить в 1 клик
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-text">Купить в 1 клик</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Закрыть"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Оставьте телефон, и мы свяжемся с вами для подтверждения заказа.
            </p>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя (необязательно)
                </label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон
                </label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Комментарий (необязательно)
                </label>
                <textarea
                  className="form-input min-h-[90px]"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-green-700">{message}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-action-blue text-gray-800 font-medium py-3 min-h-[44px] disabled:opacity-70"
              >
                {isSubmitting ? 'Отправляем...' : 'Отправить заявку'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
