'use client'

import { useState } from 'react'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ContactHelpFormProps {
  isSprintTheme?: boolean
  onSuccess?: () => void
}

export function ContactHelpForm({ isSprintTheme = false, onSuccess }: ContactHelpFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
        }),
      })
      const data = (await res.json()) as { error?: string } | { success?: boolean }
      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setPhone('')
        setMessage('')
        onSuccess?.()
      } else {
        setStatus('error')
        setErrorMessage('error' in data ? data.error ?? 'Произошла ошибка' : 'Произошла ошибка')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Ошибка сети. Попробуйте позже.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={`rounded-xl border p-5 text-center ${
          isSprintTheme
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-gray-200 bg-green-50/80'
        }`}
      >
        <p className={`text-base font-medium ${isSprintTheme ? 'text-emerald-200' : 'text-green-800'}`}>
          Спасибо! Мы свяжемся с вами в ближайшее время.
        </p>
      </div>
    )
  }

  const labelClassName = isSprintTheme ? 'text-slate-300' : 'text-gray-700'
  const fieldClassName = isSprintTheme
    ? 'border-slate-700 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus-visible:ring-[#7AA2FF] focus-visible:ring-offset-[#101828]'
    : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="contact-help-name" className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          Имя <span className="text-red-500">*</span>
        </label>
        <Input
          id="contact-help-name"
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
        <label htmlFor="contact-help-phone" className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          Телефон <span className="text-red-500">*</span>
        </label>
        <Input
          id="contact-help-phone"
          type="tel"
          required
          placeholder="+7 (999) 123-45-67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={status === 'loading'}
          className={`w-full ${fieldClassName}`}
        />
      </div>
      <div>
        <label htmlFor="contact-help-email" className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          id="contact-help-email"
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
        <label htmlFor="contact-help-message" className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          Опишите свой вопрос <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="contact-help-message"
          required
          placeholder="Чем мы можем помочь?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'loading'}
          rows={4}
          minLength={10}
          maxLength={2000}
          className={`w-full resize-y ${fieldClassName}`}
        />
      </div>
      {status === 'error' && errorMessage ? (
        <p className="text-sm text-red-500" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        disabled={status === 'loading'}
        className={`w-full ${isSprintTheme ? 'bg-[#7AA2FF] text-[#06101f] hover:bg-[#8fb0ff]' : ''}`}
      >
        {status === 'loading' ? 'Отправка…' : 'Отправить'}
      </Button>
    </form>
  )
}
