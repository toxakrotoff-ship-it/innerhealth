'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button';

function resolveBrandQuery(pathname: string, searchParams: URLSearchParams): string {
  const explicitBrand = searchParams.get('brand')?.trim();
  if (explicitBrand) return `?brand=${encodeURIComponent(explicitBrand)}`;

  const pathnameBrand = pathname.match(/\/admin(?:-panel)?\/(inner|sprint-power)(?:\/|$)/)?.[1];
  return pathnameBrand ? `?brand=${encodeURIComponent(pathnameBrand)}` : '';
}

function TelegramBlock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandQuery = resolveBrandQuery(pathname, searchParams);
  const [status, setStatus] = useState<{ linked: boolean; linkedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [linkResult, setLinkResult] = useState<{
    startUrl: string;
    expiresAt: string;
    expiresInMinutes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch(`/api/admin/telegram/status${brandQuery}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatus({ linked: data.linked, linkedAt: data.linkedAt });
    if (data.linked) setLinkResult(null);
  }

  useEffect(() => {
    loadStatus()
      .catch(() => setStatus({ linked: false, linkedAt: null }))
      .finally(() => setLoading(false));
  }, [brandQuery]);

  async function handleConnect() {
    setCreating(true);
    setError(null);
    setLinkResult(null);
    try {
      const res = await fetch(`/api/admin/telegram/link-code${brandQuery}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось создать ссылку');
      }
      const data = await res.json();
      setLinkResult({
        startUrl: data.startUrl,
        expiresAt: data.expiresAt,
        expiresInMinutes: data.expiresInMinutes ?? 10,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
  }

  async function handleRefreshStatus() {
    setRefreshing(true);
    setError(null);
    try {
      await loadStatus();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Уведомления Telegram</h2>
        <p className="text-gray-500 text-sm">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Уведомления Telegram</h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}
      {status?.linked ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-green-800">Telegram подключён</p>
                <p className="mt-0.5 text-sm text-green-700">
                  Вы получаете уведомления о новых заказах и заявках с сайта.
                </p>
                {status.linkedAt && (
                  <p className="mt-1 text-xs text-green-600">
                    Привязан {new Date(status.linkedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleRefreshStatus} disabled={refreshing}>
            {refreshing ? 'Проверка…' : 'Обновить статус'}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-4">
            Подключите Telegram, чтобы получать уведомления о новых заказах и заявках с сайта.
          </p>
          {linkResult ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Ссылка действительна {linkResult.expiresInMinutes} мин. Нажмите ссылку и в боте нажмите
                «Start» (или отправьте команду /start).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={linkResult.startUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Открыть бота в Telegram
                </a>
                <Button type="button" variant="outline" size="sm" onClick={handleRefreshStatus} disabled={refreshing}>
                  {refreshing ? 'Проверка…' : 'Проверить статус'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                После нажатия «Start» в боте нажмите «Проверить статус» — страница обновится без перезагрузки.
              </p>
            </div>
          ) : (
            <Button type="button" onClick={handleConnect} disabled={creating}>
              {creating ? 'Создание ссылки…' : 'Подключить Telegram'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function MaxBlock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandQuery = resolveBrandQuery(pathname, searchParams);
  const [status, setStatus] = useState<{ linked: boolean; linkedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [linkResult, setLinkResult] = useState<{ startUrl: string; expiresInMinutes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch(`/api/admin/max/status${brandQuery}`);
    if (!res.ok) return;
    const data = await res.json();
    setStatus({ linked: data.linked, linkedAt: data.linkedAt });
    if (data.linked) setLinkResult(null);
  }

  useEffect(() => {
    loadStatus()
      .catch(() => setStatus({ linked: false, linkedAt: null }))
      .finally(() => setLoading(false));
  }, [brandQuery]);

  async function handleConnect() {
    setCreating(true);
    setError(null);
    setLinkResult(null);
    try {
      const res = await fetch(`/api/admin/max/link-code${brandQuery}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось создать ссылку');
      }
      const data = await res.json();
      setLinkResult({
        startUrl: data.startUrl,
        expiresInMinutes: data.expiresInMinutes ?? 10,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setCreating(false);
    }
  }

  async function handleRefreshStatus() {
    setRefreshing(true);
    setError(null);
    try {
      await loadStatus();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Уведомления MAX</h2>
        <p className="text-gray-500 text-sm">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Уведомления MAX</h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}
      {status?.linked ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600" aria-hidden>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-green-800">MAX подключён</p>
                <p className="mt-0.5 text-sm text-green-700">Вы получаете уведомления о новых заказах и заявках с сайта.</p>
                {status.linkedAt && (
                  <p className="mt-1 text-xs text-green-600">
                    Привязан {new Date(status.linkedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleRefreshStatus} disabled={refreshing}>
            {refreshing ? 'Проверка…' : 'Обновить статус'}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-4">
            Подключите MAX, чтобы получать уведомления о новых заказах и заявках с сайта.
          </p>
          {linkResult ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Ссылка действительна {linkResult.expiresInMinutes} мин. Нажмите ссылку и в боте нажмите «Start» (или отправьте команду
                /start).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={linkResult.startUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Открыть бота в MAX
                </a>
                <Button type="button" variant="outline" size="sm" onClick={handleRefreshStatus} disabled={refreshing}>
                  {refreshing ? 'Проверка…' : 'Проверить статус'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                После нажатия «Start» в боте нажмите «Проверить статус» — страница обновится без перезагрузки.
              </p>
            </div>
          ) : (
            <Button type="button" onClick={handleConnect} disabled={creating}>
              {creating ? 'Создание ссылки…' : 'Подключить MAX'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export default function AdminProfilePage() {
  const [data, setData] = useState<ProfileData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/profile');
      if (!res.ok) throw new Error('Не удалось загрузить профиль');
      const json = await res.json();
      setData({
        email: json.email ?? '',
        firstName: json.firstName ?? '',
        lastName: json.lastName ?? '',
        phone: json.phone ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Не удалось сохранить профиль');
      }
      const json = await res.json();
      setData({
        email: json.email ?? data.email,
        firstName: json.firstName ?? '',
        lastName: json.lastName ?? '',
        phone: json.phone ?? '',
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof ProfileData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Редактировать профиль</h1>
        <p className="text-gray-500 mb-6">
          Фамилия, имя и телефон для отображения и связи. Уведомления в Telegram настраиваются ниже.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm">
            Профиль сохранён.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Личные данные</h2>
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  className="form-input w-full"
                  placeholder="Иванова"
                  value={data.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Имя
                </label>
                <input
                  id="firstName"
                  type="text"
                  className="form-input w-full"
                  placeholder="Анна"
                  value={data.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input w-full"
                  placeholder="+7 (999) 123-45-67"
                  value={data.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-600">{data.email}</p>
                <p className="text-sm text-gray-500 mt-0.5">Изменить email нельзя.</p>
              </div>
            </div>
          </div>

          <TelegramBlock />
          <MaxBlock />

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить профиль'}
            </Button>
            <Button type="button" variant="outline" onClick={loadProfile} disabled={saving}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
