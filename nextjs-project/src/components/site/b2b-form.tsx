'use client'

import { useRef, useState } from 'react'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'

const B2B_FORMAT_OPTIONS = [
  'Розничный магазин',
  'Интернет-магазин',
  'Клиника',
  'Специалист',
  'Другое',
] as const

interface B2bFormProps {
  isSprintTheme?: boolean
  successMessage: string
}

export function B2bForm({ isSprintTheme = false, successMessage }: B2bFormProps) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const formStartedAt = useRef(Date.now())
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
          format,
          city: city.trim(),
          email: email.trim(),
          phone: phone.trim(),
          website,
          formStartedAt: formStartedAt.current,
        }),
      })
      const data = (await res.json()) as { error?: string } | { success?: boolean }
      if (res.ok) {
        setStatus('success')
        setName('')
        setFormat('')
        setCity('')
        setEmail('')
        setPhone('')
        setWebsite('')
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
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="b2b-website">Website</label>
        <input
          id="b2b-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
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
        <label htmlFor="b2b-format" className={`mb-1.5 block text-sm font-medium ${labelClassName}`}>
          Формат сотрудничества <span className="text-red-500">*</span>
        </label>
        <select
          id="b2b-format"
          required
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          disabled={status === 'loading'}
          className={`flex h-10 w-full rounded-[16px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldClassName}`}
        >
          <option value="" disabled>
            Выберите формат
          </option>
          {B2B_FORMAT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="b2b-city" className={`mb-1.5 block text-sm font-medium ${labelClassName}`}>
          Город
        </label>
        <Input
          id="b2b-city"
          type="text"
          placeholder="Ваш город"
          value={city}
          onChange={(e) => setCity(e.target.value)}
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
