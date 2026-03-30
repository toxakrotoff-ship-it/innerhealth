'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/button';

export function PartnerMaxBlock() {
  const [status, setStatus] = useState<{ linked: boolean; linkedAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [linkResult, setLinkResult] = useState<{ startUrl: string; expiresInMinutes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    const response = await fetch('/api/account/max/status');
    if (!response.ok) return;
    const data = await response.json();
    setStatus({ linked: data.linked, linkedAt: data.linkedAt });
    if (data.linked) setLinkResult(null);
  }

  useEffect(() => {
    loadStatus()
      .catch(() => setStatus({ linked: false, linkedAt: null }))
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect() {
    setCreating(true);
    setError(null);
    setLinkResult(null);
    try {
      const response = await fetch('/api/account/max/link-code', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось создать ссылку');
      }
      const data = await response.json();
      setLinkResult({
        startUrl: data.startUrl,
        expiresInMinutes: data.expiresInMinutes ?? 10,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
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
      <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Уведомления в MAX</h2>
        <p className="text-gray-500 text-sm">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Уведомления в MAX</h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}
      {status?.linked ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"
                aria-hidden
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-medium text-green-800">MAX подключён</p>
                <p className="mt-0.5 text-sm text-green-700">
                  Вы получаете уведомления о заказах по вашим промокодам. В боте доступна команда /stats с количеством заказов по промокодам.
                </p>
                {status.linkedAt && (
                  <p className="mt-1 text-xs text-green-600">
                    Привязан{' '}
                    {new Date(status.linkedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
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
            Подключите MAX, чтобы получать уведомления о заказах по вашим промокодам и смотреть количество заказов командой /stats в боте.
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
                После нажатия «Start» в боте нажмите «Проверить статус» — страница обновится.
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
