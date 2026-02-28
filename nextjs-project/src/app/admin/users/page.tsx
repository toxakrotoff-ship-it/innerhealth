'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/button';

const ROLES = [
  { value: 'USER', label: 'Пользователь' },
  { value: 'WRITER', label: 'Автор' },
  { value: 'ADMIN', label: 'Администратор' },
  { value: 'PARTNER', label: 'Партнёр' },
] as const;

const ROLE_FILTERS = [
  { value: '', label: 'Все' },
  ...ROLES,
] as const;

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  promoCodes?: { id: string; code: string; commissionPercent: number }[];
  ordersCount?: number;
  totalRevenue?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'USER' as string,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const url = roleFilter ? `/api/admin/users?role=${encodeURIComponent(roleFilter)}` : '/api/admin/users';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось загрузить пользователей');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim() || undefined,
          role: formData.role,
        }),
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать пользователя');
      }
      await fetchUsers();
      setShowForm(false);
      setFormData({ email: '', name: '', role: 'USER' });
      if (data.emailSent) {
        setSuccessMessage(`Пользователь создан. Ссылка для завершения регистрации отправлена на ${data.email}.`);
      } else {
        setSuccessMessage(
          `Пользователь создан. Письмо со ссылкой не отправлено${data.emailError ? `: ${data.emailError}` : ' — проверьте настройки SMTP.'}`
        );
      }
      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!ROLES.some((r) => r.value === newRole)) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось обновить роль');
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  }

  async function handleDelete(user: AdminUser) {
    if (!window.confirm(`Удалить пользователя ${user.email}?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось удалить пользователя');
      }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="h-10 bg-gray-200 rounded w-40 mb-8" />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-12 bg-gray-200" />
            <div className="p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded mb-2" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-gray-600 mt-1">Управление пользователями и ролями</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowForm(true);
            setFormData({ email: '', name: '', role: 'USER' });
          }}
        >
          <svg
            className="w-5 h-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить пользователя
        </Button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600">Роль:</span>
        {ROLE_FILTERS.map((r) => (
          <button
            key={r.value || 'all'}
            type="button"
            onClick={() => setRoleFilter(r.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              (r.value === '' && roleFilter === '') || roleFilter === r.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Новый пользователь</h2>
          <p className="text-sm text-gray-600 mb-6">
            На указанный email будет отправлена ссылка для завершения регистрации (без пароля в письме). Пользователь перейдёт по ссылке, получит код на почту и задаст пароль сам.
          </p>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                <select
                  className="form-input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" type="submit">
                Создать
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ email: '', name: '', role: 'USER' });
                }}
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}

      {users.length === 0 ? (
        <div className="card">
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет пользователей</h3>
            <p className="mt-1 text-sm text-gray-500">Добавьте первого пользователя.</p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Добавить пользователя
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive overflow-x-auto">
            <table className="table table-horizontal min-w-[640px]">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Имя
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  {(roleFilter === 'PARTNER' || users.some((u) => u.role === 'PARTNER')) && (
                    <>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Промокоды
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Заказов
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Сумма выкупа
                      </th>
                    </>
                  )}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        className="form-input text-sm py-1.5 pr-8"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {(roleFilter === 'PARTNER' || users.some((u) => u.role === 'PARTNER')) && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {user.role === 'PARTNER' && user.promoCodes?.length
                            ? user.promoCodes.map((p) => p.code).join(', ')
                            : user.role === 'PARTNER'
                              ? '—'
                              : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {user.role === 'PARTNER' && user.ordersCount !== undefined ? user.ordersCount : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {user.role === 'PARTNER' && user.totalRevenue !== undefined
                            ? new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(user.totalRevenue)
                            : '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap flex items-center gap-1">
                      {user.role === 'PARTNER' && (
                        <Link
                          href={`/admin/partners/${user.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded transition"
                          title="Настроить партнёра"
                          aria-label="Настроить партнёра"
                        >
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded transition"
                        title="Удалить пользователя"
                        aria-label="Удалить пользователя"
                      >
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
