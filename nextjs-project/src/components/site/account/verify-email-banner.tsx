'use client'

import { useState } from 'react'

export function VerifyEmailBanner() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function requestVerificationEmail() {
    setIsLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        setMessage(data?.error ?? 'Не удалось отправить письмо подтверждения')
        return
      }

      setMessage('Письмо для подтверждения отправлено. Проверьте вашу почту.')
    } catch {
      setMessage('Не удалось отправить письмо подтверждения')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
      <p className="text-sm font-medium text-amber-900">
        Подтвердите email, чтобы открыть заказы и сохранённые адреса.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={requestVerificationEmail}
          disabled={isLoading}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Отправляем...' : 'Отправить письмо подтверждения'}
        </button>
        {message ? <p className="text-sm text-amber-900">{message}</p> : null}
      </div>
    </div>
  )
}
