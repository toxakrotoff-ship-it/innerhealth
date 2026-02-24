'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const inputClassName =
  'block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 pl-4 text-[#1a2332] shadow-none placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6'

type Step = 'code' | 'password'

function SetInitialPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get('token') ?? ''

  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const sentCodeOnceRef = useRef(false)

  const sendCode = useCallback(async () => {
    if (!tokenFromUrl) return
    try {
      const res = await fetch('/api/auth/send-initial-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok) {
        setCodeSent(true)
        setMessage('')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Не удалось отправить код')
      }
    } catch {
      setStatus('error')
      setMessage('Ошибка сети')
    }
  }, [tokenFromUrl])

  useEffect(() => {
    if (!tokenFromUrl) setStatus('error')
    else if (step === 'code' && !sentCodeOnceRef.current) {
      sentCodeOnceRef.current = true
      sendCode()
    }
  }, [tokenFromUrl, step, sendCode])

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.replace(/\D/g, '').slice(0, 6)
    if (trimmed.length !== 6) {
      setMessage('Введите 6 цифр кода')
      setStatus('error')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/auth/verify-initial-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl, code: trimmed }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok) {
        setStep('password')
        setStatus('idle')
        setMessage('')
      } else {
        setStatus('error')
        setMessage(data.error ?? 'Ошибка')
      }
    } catch {
      setStatus('error')
      setMessage('Ошибка сети')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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
      const res = await fetch('/api/auth/set-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl, password }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (res.ok) {
        setStatus('success')
        setMessage(data.message ?? 'Пароль установлен. Перенаправление на вход…')
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

  const heroBg = (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      <div
        className="absolute -inset-[10px] will-change-transform
          [--aurora:repeating-linear-gradient(100deg,#3B66F5_8%,#2563eb_14%,#1e3a5f_20%,#D9EFFF_26%,#475569_32%)]
          [background-image:var(--aurora)]
          bg-size-[300%_200%]
          bg-position-[50%_50%]
          blur-md
          opacity-[0.48]
          animate-aurora
          mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,black_25%,transparent_65%)]"
      />
    </div>
  )

  if (!tokenFromUrl) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2332]">
        {heroBg}
        <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
          <Link
            href="/"
            className="relative z-20 mb-2 flex items-center gap-2 px-2 py-1 text-sm font-normal text-white"
          >
            <Image src="/logo.png" alt="Inner Health" width={30} height={30} className="h-8 w-8 object-contain" />
            <span className="font-medium">Inner Health</span>
          </Link>
          <h1 className="my-4 text-center text-xl font-bold text-white md:text-4xl">Завершение регистрации</h1>
          <p className="mb-6 w-full text-center text-sm text-red-400">
            Недействительная или отсутствующая ссылка.
          </p>
          <Link href="/login" className="text-highlight-blue hover:underline block text-center text-sm">
            ← Вход
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2332]">
        {heroBg}
        <form
          onSubmit={handleCodeSubmit}
          className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10"
        >
          <Link
            href="/"
            className="relative z-20 mb-2 flex items-center gap-2 px-2 py-1 text-sm font-normal text-white"
          >
            <Image src="/logo.png" alt="Inner Health" width={30} height={30} className="h-8 w-8 object-contain" />
            <span className="font-medium">Inner Health</span>
          </Link>
          <h1 className="my-4 text-center text-xl font-bold text-white md:text-4xl">Завершение регистрации</h1>
          <p className="mb-4 w-full text-center text-sm text-white/80">
            На вашу почту отправлен одноразовый код из 6 цифр. Введите его ниже.
          </p>
          {status === 'error' && message && (
            <p className="mb-2 w-full text-center text-sm text-red-400">{message}</p>
          )}
          <div className="w-full space-y-4 pb-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={inputClassName}
              placeholder="000000"
              disabled={status === 'loading'}
            />
          </div>
          <div className="w-full">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="group/btn relative w-full rounded-lg bg-white px-4 py-3 text-[#1a2332] disabled:opacity-70"
            >
              <span className="relative text-sm font-medium">
                {status === 'loading' ? 'Проверка…' : 'Продолжить'}
              </span>
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-white/80">
            Не пришёл код?{' '}
            <button type="button" onClick={sendCode} className="text-highlight-blue hover:underline">
              Отправить снова
            </button>
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2332]">
      {heroBg}
      <form
        onSubmit={handlePasswordSubmit}
        className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10"
      >
        <Link
          href="/"
          className="relative z-20 mb-2 flex items-center gap-2 px-2 py-1 text-sm font-normal text-white"
        >
          <Image src="/logo.png" alt="Inner Health" width={30} height={30} className="h-8 w-8 object-contain" />
          <span className="font-medium">Inner Health</span>
        </Link>
        <h1 className="my-4 text-center text-xl font-bold text-white md:text-4xl">Новый пароль</h1>
        <p className="mb-4 w-full text-center text-sm text-white/80">
          Введите новый пароль (минимум 6 символов)
        </p>
        {status === 'success' && message && (
          <p className="mb-2 w-full rounded-md bg-green-500/20 px-4 py-3 text-center text-sm text-green-100">
            {message}
          </p>
        )}
        {status === 'error' && message && (
          <p className="mb-2 w-full text-center text-sm text-red-400">{message}</p>
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

export default function SetInitialPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-[#1a2332]">
          <p className="text-white/80">Загрузка…</p>
        </div>
      }
    >
      <SetInitialPasswordForm />
    </Suspense>
  )
}
