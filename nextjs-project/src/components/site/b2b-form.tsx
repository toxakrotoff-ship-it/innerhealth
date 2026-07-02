'use client'

import { useState } from 'react'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'

interface B2bFormProps {
  isSprintTheme?: boolean
  successMessage: string
}

export function B2bForm({ isSprintTheme = false, successMessage }: B2bFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      })
      const data = (await res.json()) as { error?: string } | { success?: boolean }
      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setPhone('')
      } else {
        setStatus('error')
        setErrorMessage('error' in data ? data.error : 'Произошла ошибка')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Ошибка сети. Попробуйте позже.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={`rounded-2xl border p-8 text-center ${
          isSprintTheme
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-gray-200 bg-green-50/80'
        }`}
      >
        <p className={`text-lg font-medium ${isSprintTheme ? 'text-emerald-200' : 'text-green-800'}`}>
          {successMessage}
        </p>
      </div>
    )
  }

  const labelClassName = isSprintTheme ? 'text-slate-300' : 'text-gray-700'
  const fieldClassName = isSprintTheme
    ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-[#7AA2FF] focus-visible:ring-offset-[#101828]'
    : ''
  const buttonClassName = isSprintTheme ? 'bg-[#7AA2FF] text-[#06101f] hover:bg-[#8fb0ff]' : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div>
        <label htmlFor="b2b-name" className={`mb-1.5 block text-sm font-medium ${labelClassName}`}>
          Имя <span className="text-red-500">*</span>
        </label>
        <Input
          id="b2b-name"
          type="text"
          required
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === 'loading'}
          maxLength={120}
          className={`w-full ${fieldClassName}`}
        />
      </div>
      <div>
        <label htmlFor="b2b-email" className={`mb-1.5 block text-sm font-medium ${labelClassName}`}>
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          id="b2b-email"
          type="email"
          required
          placeholder="example@mail.ru"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className={`w-full ${fieldClassName}`}
        />
      </div>
      <div>
        <label htmlFor="b2b-phone" className={`mb-1.5 block text-sm font-medium ${labelClassName}`}>
          Телефон <span className="text-red-500">*</span>
        </label>
        <Input
          id="b2b-phone"
          type="tel"
          required
          placeholder="+7 (999) 123-45-67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={status === 'loading'}
          className={`w-full ${fieldClassName}`}
        />
      </div>
      {errorMessage && (
        <p className={`text-sm ${isSprintTheme ? 'text-rose-300' : 'text-red-600'}`} role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit" disabled={status === 'loading'} className={`w-full sm:w-auto ${buttonClassName}`}>
        {status === 'loading' ? 'Отправка…' : 'Отправить заявку'}
      </Button>
    </form>
  )
}
