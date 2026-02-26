'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type VerifyState = 'loading' | 'success' | 'error'

interface VerifyResponse {
  ok?: boolean
  error?: string
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])
  const [state, setState] = useState<VerifyState>('loading')
  const [message, setMessage] = useState('Проверяем ссылку подтверждения…')

  useEffect(() => {
    let isDisposed = false

    async function verifyEmail() {
      if (!token) {
        if (isDisposed) return
        setState('error')
        setMessage('Токен подтверждения отсутствует в ссылке.')
        return
      }

      try {
        const response = await fetch('/api/auth/verify-email/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = (await response.json().catch(() => null)) as VerifyResponse | null

        if (!response.ok) {
          if (isDisposed) return
          setState('error')
          setMessage(data?.error ?? 'Не удалось подтвердить email.')
          return
        }

        if (isDisposed) return
        setState('success')
        setMessage('Email успешно подтвержден. Теперь доступны все функции личного кабинета.')
      } catch {
        if (isDisposed) return
        setState('error')
        setMessage('Не удалось подтвердить email.')
      }
    }

    void verifyEmail()
    return () => {
      isDisposed = true
    }
  }, [token])

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-text">Подтверждение email</h1>
        <p
          className={`mt-3 text-sm ${
            state === 'success'
              ? 'text-emerald-700'
              : state === 'error'
                ? 'text-red-600'
                : 'text-gray-600'
          }`}
        >
          {message}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-action-blue px-5 py-2 text-sm font-medium text-gray-800 hover:bg-action-blue/90"
          >
            Войти
          </Link>
          <Link
            href="/account"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-text hover:border-action-blue"
          >
            В личный кабинет
          </Link>
        </div>
      </div>
    </div>
  )
}
