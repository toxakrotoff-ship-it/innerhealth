'use client'

import { useState } from 'react'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyPhoneMask, getPhoneDigits, validatePhoneRu } from '@/lib/phone-mask'
import { validateEmail } from '@/lib/validations/contact'

interface ContactHelpFormProps {
  isSprintTheme?: boolean
  onSuccess?: () => void
}

const MESSAGE_MIN = 5

export function ContactHelpForm({ isSprintTheme = false, onSuccess }: ContactHelpFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [messageError, setMessageError] = useState('')

  const trimmedEmail = email.trim()
  const trimmedMessage = message.trim()
  const phoneDigits = getPhoneDigits(phone)
  const hasEmail = trimmedEmail.length > 0
  const hasPhone = phoneDigits.length > 1
  const isPhoneRequired = !hasEmail
  const isEmailRequired = !hasPhone

  function validateForm(): boolean {
    let isValid = true
    setPhoneError('')
    setEmailError('')
    setMessageError('')

    if (!hasEmail && !hasPhone) {
      setPhoneError('Укажите email или номер телефона')
      setEmailError('Укажите email или номер телефона')
      isValid = false
    }

    if (hasPhone) {
      const phoneCheck = validatePhoneRu(phone)
      if (phoneCheck.valid === false) {
        setPhoneError(phoneCheck.message)
        isValid = false
      }
    }

    if (hasEmail) {
      const emailCheck = validateEmail(trimmedEmail)
      if (emailCheck.valid === false) {
        setEmailError(emailCheck.message)
        isValid = false
      }
    }

    if (trimmedMessage.length < MESSAGE_MIN) {
      setMessageError(`Вопрос: минимум ${MESSAGE_MIN} символов`)
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!validateForm()) {
      setStatus('error')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/contact-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: hasEmail ? trimmedEmail : '',
          phone: hasPhone ? phone.trim() : '',
          message: trimmedMessage,
        }),
      })
      const data = (await res.json()) as { error?: string } | { success?: boolean }
      if (res.ok) {
        setStatus('success')
        setName('')
        setEmail('')
        setPhone('')
        setMessage('')
        setPhoneError('')
        setEmailError('')
        setMessageError('')
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
  const fieldErrorClassName = 'border-red-500 focus-visible:ring-red-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
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
          Телефон {isPhoneRequired ? <span className="text-red-500">*</span> : null}
        </label>
        <Input
          id="contact-help-phone"
          type="tel"
          autoComplete="tel"
          placeholder="+7 (999) 999-99-99"
          value={phone}
          onFocus={() => {
            if (!phone) setPhone('+7')
          }}
          onChange={(e) => {
            setPhone(applyPhoneMask(e.target.value))
            if (phoneError) setPhoneError('')
          }}
          onBlur={() => {
            if (phoneDigits.length > 1) {
              const result = validatePhoneRu(phone)
              setPhoneError(result.valid === false ? result.message : '')
            }
          }}
          disabled={status === 'loading'}
          aria-invalid={!!phoneError}
          aria-describedby={phoneError ? 'contact-help-phone-error' : undefined}
          className={`w-full ${fieldClassName} ${phoneError ? fieldErrorClassName : ''}`}
        />
        {phoneError ? (
          <p id="contact-help-phone-error" className="mt-1 text-sm text-red-500" role="alert">
            {phoneError}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="contact-help-email" className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          Email {isEmailRequired ? <span className="text-red-500">*</span> : null}
        </label>
        <Input
          id="contact-help-email"
          type="email"
          autoComplete="email"
          placeholder="example@mail.ru"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) setEmailError('')
          }}
          onBlur={() => {
            if (hasEmail) {
              const result = validateEmail(trimmedEmail)
              setEmailError(result.valid === false ? result.message : '')
            }
          }}
          disabled={status === 'loading'}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'contact-help-email-error' : undefined}
          className={`w-full ${fieldClassName} ${emailError ? fieldErrorClassName : ''}`}
        />
        {emailError ? (
          <p id="contact-help-email-error" className="mt-1 text-sm text-red-500" role="alert">
            {emailError}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="contact-help-message" className={`mb-1 block text-sm font-medium ${labelClassName}`}>
          Опишите свой вопрос <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="contact-help-message"
          placeholder="Чем мы можем помочь?"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (messageError) setMessageError('')
          }}
          disabled={status === 'loading'}
          rows={4}
          maxLength={2000}
          aria-invalid={!!messageError}
          aria-describedby={messageError ? 'contact-help-message-error' : undefined}
          className={`w-full resize-y ${fieldClassName} ${messageError ? fieldErrorClassName : ''}`}
        />
        {messageError ? (
          <p id="contact-help-message-error" className="mt-1 text-sm text-red-500" role="alert">
            {messageError}
          </p>
        ) : null}
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
