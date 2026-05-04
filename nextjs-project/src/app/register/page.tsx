'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EMAIL_ALREADY_REGISTERED_CODE } from '@/lib/auth/email-already-registered'

interface RegisterResponse {
  ok?: boolean
  error?: string
  code?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showNetworkAccountHint, setShowNetworkAccountHint] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setShowNetworkAccountHint(false)

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      })

      const data = (await response.json().catch(() => null)) as RegisterResponse | null

      if (!response.ok) {
        if (
          response.status === 409 &&
          data?.code === EMAIL_ALREADY_REGISTERED_CODE
        ) {
          setShowNetworkAccountHint(true)
          setError(data.error ?? '')
          return
        }
        setError(data?.error ?? 'Не удалось зарегистрироваться')
        return
      }

      setSuccessMessage(
        'Регистрация прошла успешно. Мы отправили письмо для подтверждения email.'
      )
      setTimeout(() => router.push('/login'), 1500)
    } catch {
      setError('Не удалось зарегистрироваться')
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <h1 className="mb-6 text-center text-xl font-bold text-white md:text-4xl">
          Регистрация
        </h1>

        <div className="w-full space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="email@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 text-[#1a2332] placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Пароль (минимум 8 символов)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 text-[#1a2332] placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 text-[#1a2332] placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
          />
          <input
            type="text"
            placeholder="Имя (необязательно)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 text-[#1a2332] placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
          />
          <input
            type="text"
            placeholder="Фамилия (необязательно)"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 text-[#1a2332] placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
          />
          <input
            type="tel"
            placeholder="Телефон (необязательно)"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 text-[#1a2332] placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
          />
        </div>

        {showNetworkAccountHint ? (
          <div
            className="mt-4 w-full rounded-lg border border-sky-400/40 bg-sky-950/40 px-4 py-3 text-sm text-sky-100"
            role="status"
          >
            <p className="text-center leading-relaxed">{error}</p>
            <div className="mt-3 flex justify-center">
              <Link
                href={`/login?email=${encodeURIComponent(email.trim())}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-[#1a2332] hover:bg-white/90"
              >
                Войти
              </Link>
            </div>
          </div>
        ) : error ? (
          <p className="mt-3 w-full text-center text-sm text-red-400">{error}</p>
        ) : null}
        {successMessage ? (
          <p className="mt-3 w-full text-center text-sm text-emerald-300">{successMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-[#1a2332] disabled:opacity-70"
        >
          {isSubmitting ? 'Регистрируем…' : 'Зарегистрироваться'}
        </button>

        <p className="mt-4 text-center text-sm text-white/80">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-highlight-blue hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  )
}
