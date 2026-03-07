'use client'

import { useState } from 'react'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const ROLE_OPTIONS = [
  { value: '', label: 'Выберите направление' },
  { value: 'doctor', label: 'Врач' },
  { value: 'nutritionist', label: 'Нутрициолог' },
  { value: 'health_coach', label: 'Health-coach' },
  { value: 'helping_profession', label: 'Специалист помогающих профессий' },
  { value: 'fitness_trainer', label: 'Фитнес-тренер' },
  { value: 'cosmetologist', label: 'Косметолог' },
  { value: 'other', label: 'Другое' },
] as const

export function PartnershipForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [socialLinks, setSocialLinks] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/partnership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: role || undefined,
          socialLinks: socialLinks.trim() || undefined,
          message: message.trim() || undefined,
        }),
      })
      const data = (await res.json()) as { error?: string } | { success?: boolean }
      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setPhone('')
        setRole('')
        setSocialLinks('')
        setMessage('')
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
      <div className="rounded-2xl border border-gray-200 bg-green-50/80 p-8 text-center">
        <p className="text-lg font-medium text-green-800">
          Заявка отправлена. Мы свяжемся с вами в ближайшее время.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6 2xl:space-y-7 3xl:space-y-8">
      <div>
        <label htmlFor="partnership-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Имя <span className="text-red-500">*</span>
        </label>
        <Input
          id="partnership-name"
          type="text"
          required
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={status === 'loading'}
          maxLength={120}
          className="w-full"
        />
      </div>
      <div>
        <label htmlFor="partnership-email" className="mb-1.5 block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          id="partnership-email"
          type="email"
          required
          placeholder="example@mail.ru"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full"
        />
      </div>
      <div>
        <label htmlFor="partnership-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
          Телефон <span className="text-red-500">*</span>
        </label>
        <Input
          id="partnership-phone"
          type="tel"
          required
          placeholder="+7 (999) 123-45-67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={status === 'loading'}
          className="w-full"
        />
      </div>
      <div>
        <label htmlFor="partnership-role" className="mb-1.5 block text-sm font-medium text-gray-700">
          Направление деятельности
        </label>
        <select
          id="partnership-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={status === 'loading'}
          className="flex h-10 w-full rounded-[16px] border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value || 'empty'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="partnership-social" className="mb-1.5 block text-sm font-medium text-gray-700">
          Ссылки на ваши социальные сети
        </label>
        <Textarea
          id="partnership-social"
          placeholder="Например: Instagram, Telegram, ВКонтакте — чтобы мы могли проанализировать ваш профиль"
          value={socialLinks}
          onChange={(e) => setSocialLinks(e.target.value)}
          disabled={status === 'loading'}
          rows={3}
          maxLength={2000}
          className="w-full resize-y"
        />
      </div>
      <div>
        <label htmlFor="partnership-message" className="mb-1.5 block text-sm font-medium text-gray-700">
          Сообщение
        </label>
        <Textarea
          id="partnership-message"
          placeholder="Расскажите о себе и целях сотрудничества"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={status === 'loading'}
          rows={4}
          maxLength={2000}
          className="w-full resize-y"
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
        {status === 'loading' ? 'Отправка…' : 'Отправить заявку'}
      </Button>
    </form>
  )
}
