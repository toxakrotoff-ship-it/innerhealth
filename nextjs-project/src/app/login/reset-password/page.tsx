'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const inputClassName =
  'block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 pl-4 text-[#1a2332] shadow-none placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tokenFromUrl) setStatus('error')
  }, [tokenFromUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage('Пароли не совпадают')
      setStatus('error')
      return
    }
    if (password.length < 6) {
      setMessage('Минимум 6 символов')
      setStatus('error')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl, password }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (res.ok) {
        setStatus('success')
        setMessage(data.message ?? 'Пароль изменён. Перенаправление на вход…')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Ошибка')
      }
    } catch {
      setStatus('error')
      setMessage('Ошибка сети')
    }
  }

  /** No token: show error state, same hero background as login */
  if (!tokenFromUrl) {
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
          <Link
            href="/"
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

          <h1 className="my-4 text-center text-xl font-bold text-white md:text-4xl">
            Сброс пароля
          </h1>

          <p className="mb-6 w-full text-center text-sm text-red-400">
            Недействительная или отсутствующая ссылка. Запросите сброс пароля снова.
          </p>

          <div className="w-full space-y-4">
            <Link
              href="/login/forgot-password"
              className="text-highlight-blue hover:underline block text-center text-sm"
            >
              Запросить ссылку снова
            </Link>
            <Link
              href="/login"
              className="text-highlight-blue hover:underline block text-center text-sm"
            >
              ← Вход
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /** Form: new password + confirm, hero background as login */
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

      <form
        onSubmit={handleSubmit}
        className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10"
      >
        <Link
          href="/"
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

        <h1 className="my-4 text-center text-xl font-bold text-white md:text-4xl">
          Новый пароль
        </h1>

        <p className="mb-4 w-full text-center text-sm text-white/80">
          Введите новый пароль (минимум 6 символов)
        </p>

        {status === 'success' && (
          <p className="mb-2 w-full rounded-md bg-green-500/20 px-4 py-3 text-center text-sm text-green-100">
            {message}
          </p>
        )}
        {status === 'error' && (
          <p className="mb-2 w-full text-center text-sm text-red-400">
            {message}
          </p>
        )}

        <div className="w-full space-y-4 pb-4">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            placeholder="Новый пароль"
            disabled={status === 'loading' || status === 'success'}
          />
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClassName}
            placeholder="Повторите пароль"
            disabled={status === 'loading' || status === 'success'}
          />
        </div>

        <div className="w-full">
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="group/btn relative w-full rounded-lg bg-white px-4 py-3 text-[#1a2332] disabled:opacity-70"
          >
            <div className="absolute inset-0 h-full w-full transform opacity-0 transition duration-200 group-hover/btn:opacity-100">
              <div className="absolute -left-px -top-px h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-left-4 group-hover/btn:-top-4" />
              <div className="absolute -right-px -top-px h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-right-4 group-hover/btn:-top-4" />
              <div className="absolute -bottom-px -left-px h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-bottom-4 group-hover/btn:-left-4" />
              <div className="absolute -bottom-px -right-px h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-bottom-4 group-hover/btn:-right-4" />
            </div>
            <span className="relative text-sm font-medium">
              {status === 'loading' ? 'Сохранение…' : 'Сохранить пароль'}
            </span>
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-white/80">
          <Link href="/login" className="text-highlight-blue hover:underline">
            ← Вернуться к входу
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-[#1a2332]">
          <p className="text-white/80">Загрузка…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
