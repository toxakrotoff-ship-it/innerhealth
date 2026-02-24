'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signIn, getSession } from 'next-auth/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleCredentialsSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setIsSubmitting(true)
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })
      setIsSubmitting(false)
      if (result?.error) {
        setError('Неверные учетные данные')
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
    [email, password, router]
  )

  const handleContinueWithEmail = useCallback(() => {
    if (!showEmailForm) {
      setShowEmailForm(true)
      setError('')
      return
    }
  }, [showEmailForm])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a2332]">
      {/* Aurora-фон как в HERO блоке главной */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        <div
          className="absolute -inset-[10px] will-change-transform
            [--aurora:repeating-linear-gradient(100deg,#3B66F5_8%,#2563eb_14%,#1e3a5f_20%,#D9EFFF_26%,#475569_32%)]
            [background-image:var(--aurora)]
            [background-size:300%_200%]
            [background-position:50%_50%]
            blur-[12px]
            opacity-[0.48]
            animate-aurora
            [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_25%,transparent_65%)]"
        />
      </div>

      <form
        onSubmit={handleCredentialsSubmit}
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
          Вход в аккаунт
        </h1>

        {/* Email + password fields: animated reveal */}
        <div
          className="grid w-full transition-[grid-template-rows,opacity,margin] duration-300 ease-out"
          style={{
            gridTemplateRows: showEmailForm ? '1fr' : '0fr',
            opacity: showEmailForm ? 1 : 0,
            marginBottom: showEmailForm ? undefined : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 pb-4">
              <input
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={showEmailForm}
                className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 pl-4 text-[#1a2332] shadow-none placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
              />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={showEmailForm}
                className="block h-10 w-full rounded-md border border-white/20 bg-white px-4 py-1.5 pl-4 text-[#1a2332] shadow-none placeholder:text-neutral-500 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:outline-none sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-2 w-full text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="w-full">
          <button
            type={showEmailForm ? 'submit' : 'button'}
            onClick={showEmailForm ? undefined : handleContinueWithEmail}
            disabled={showEmailForm && isSubmitting}
            className="group/btn relative w-full rounded-lg bg-white px-4 py-3 text-[#1a2332] disabled:opacity-70"
          >
            {/* Corner bracket hover animation */}
            <div className="absolute inset-0 h-full w-full transform opacity-0 transition duration-200 group-hover/btn:opacity-100">
              <div className="absolute -left-px -top-px h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-left-4 group-hover/btn:-top-4" />
              <div className="absolute -right-px -top-px h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-right-4 group-hover/btn:-top-4" />
              <div className="absolute -bottom-px -left-px h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-bottom-4 group-hover/btn:-left-4" />
              <div className="absolute -bottom-px -right-px h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-white bg-transparent transition-all duration-200 group-hover/btn:-bottom-4 group-hover/btn:-right-4" />
            </div>
            <span className="relative text-sm font-medium">
              {showEmailForm ? (isSubmitting ? 'Вход…' : 'Войти') : 'Продолжить с email'}
            </span>
          </button>
        </div>

        {showEmailForm && (
          <p className="mt-4 text-center text-sm text-white/80">
            <Link
              href="/login/forgot-password"
              className="text-[#D9EFFF] hover:underline"
            >
              Забыли пароль?
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}
