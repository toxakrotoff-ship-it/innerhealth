'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChangePasswordForm() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [statusForm, setStatusForm] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      setMessage('Новый пароль и подтверждение не совпадают')
      setStatusForm('error')
      return
    }
    if (newPassword.length < 6) {
      setMessage('Новый пароль не менее 6 символов')
      setStatusForm('error')
      return
    }
    setStatusForm('loading')
    setMessage('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
        credentials: 'include',
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (res.ok) {
        setStatusForm('success')
        setMessage(data.message ?? 'Пароль изменён. Перенаправление в админ-панель…')
        setTimeout(() => router.push('/admin'), 1500)
      } else {
        setStatusForm('error')
        setMessage(data.error ?? 'Ошибка')
      }
    } catch {
      setStatusForm('error')
      setMessage('Ошибка сети')
    }
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h2 className="login-title">Смена пароля</h2>
          <p className="login-subtitle">
            При первом входе необходимо сменить пароль, отправленный на вашу почту.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {statusForm === 'success' && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-3 text-sm">
              {message}
            </div>
          )}
          {statusForm === 'error' && (
            <div className="alert alert-error">
              <div className="text-sm">{message}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="current" className="block text-sm font-medium text-gray-700 mb-1">
                Текущий пароль
              </label>
              <input
                id="current"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
                placeholder="Пароль из письма"
                disabled={statusForm === 'loading' || statusForm === 'success'}
              />
            </div>
            <div>
              <label htmlFor="new" className="block text-sm font-medium text-gray-700 mb-1">
                Новый пароль
              </label>
              <input
                id="new"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="Не менее 6 символов"
                disabled={statusForm === 'loading' || statusForm === 'success'}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Подтверждение
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="form-input"
                placeholder="Повторите новый пароль"
                disabled={statusForm === 'loading' || statusForm === 'success'}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={statusForm === 'loading' || statusForm === 'success'}
            >
              {statusForm === 'loading' ? 'Сохранение…' : 'Сменить пароль'}
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            <Link href="/login" className="text-action-blue hover:underline">
              Выйти и войти снова
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
