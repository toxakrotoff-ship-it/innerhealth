'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signIn, getSession } from 'next-auth/react'
import { OtpSixInput } from '@/components/auth/otp-six-input'

const RESEND_COOLDOWN_SEC = 60

function Login2FAForm() {
  const searchParams = useSearchParams()
  const method = (searchParams.get('method') ?? 'email') as 'email' | 'totp'
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      if (!/^\d{6}$/.test(code)) {
        setError('Введите 6-значный код')
        return
      }
      setIsSubmitting(true)
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setIsSubmitting(false)
        setError(data.error ?? 'Неверный код')
        return
      }
      const result = await signIn('credentials', {
        grantToken: data.grantToken,
        redirect: false,
      })
      setIsSubmitting(false)
      if (result?.error) {
        setError('Сессия истекла, войдите снова')
        return
      }
      const session = await getSession()
      if (session?.user?.mustChangePassword) {
        router.push('/login/change-password')
      } else {
        router.push('/admin/catalog')
      }
      router.refresh()
    },
    [code, router]
  )

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return
    setError('')
    const res = await fetch('/api/auth/2fa/send-code', {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      setResendCooldown(RESEND_COOLDOWN_SEC)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Не удалось отправить код')
    }
  }, [resendCooldown])

  const title =
    method === 'email'
      ? 'Введите код из письма'
      : 'Введите код из приложения'

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2332]">
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
        aria-hidden
      >
        <div
          className="absolute -inset-[10px] will-change-transform
            [--aurora:repeating-linear-gradient(100deg,#88AFCB_8%,#7AA8C4_14%,#6B9BB5_20%,#E6F3FD_26%,#A8C4D4_32%)]
            [background-image:var(--aurora)]
            bg-size-[300%_200%]
            bg-position-[50%_50%]
            blur-md
            opacity-[0.48]
            animate-aurora
            mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,black_25%,transparent_65%)]"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
        <Link
          href="/login"
          className="relative z-20 mb-2 flex items-center gap-2 px-2 py-1 text-sm font-normal text-white"
        >
          <Image
            src="/logo.png"
            alt="Inner Health"
            width={30}
            height={30}
            className="h-8 w-8 object-contain"
          />
          <span className="font-medium">Inner Health</span>
        </Link>

        <h1 className="my-4 text-center text-xl font-bold text-white md:text-2xl">
          {title}
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="flex justify-center gap-2">
            <OtpSixInput
              value={code}
              onChange={setCode}
              aria-label="Код подтверждения"
              className="flex gap-2"
            />
          </div>
          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6}
            className="group/btn relative w-full rounded-lg bg-white px-4 py-3 text-[#1a2332] disabled:opacity-70"
          >
            <span className="relative text-sm font-medium">
              {isSubmitting ? 'Вход…' : 'Войти'}
            </span>
          </button>
          {method === 'email' && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full text-center text-sm text-white/80 hover:text-white disabled:opacity-50"
            >
              {resendCooldown > 0
                ? `Отправить повторно через ${resendCooldown} с`
                : 'Отправить код повторно'}
            </button>
          )}
        </form>

        <Link
          href="/login"
          className="mt-6 text-sm text-white/80 hover:text-white"
        >
          ← Назад к входу
        </Link>
      </div>
    </div>
  )
}

function Login2FAPageFallback() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2332]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        <div
          className="absolute -inset-[10px] will-change-transform
            [--aurora:repeating-linear-gradient(100deg,#88AFCB_8%,#7AA8C4_14%,#6B9BB5_20%,#E6F3FD_26%,#A8C4D4_32%)]
            [background-image:var(--aurora)]
            bg-size-[300%_200%]
            bg-position-[50%_50%]
            blur-md
            opacity-[0.48]
            animate-aurora
            mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,black_25%,transparent_65%)]"
        />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
        <p className="text-white/80">Загрузка…</p>
      </div>
    </div>
  )
}

export default function Login2FAPage() {
  return (
    <Suspense fallback={<Login2FAPageFallback />}>
      <Login2FAForm />
    </Suspense>
  )
}
