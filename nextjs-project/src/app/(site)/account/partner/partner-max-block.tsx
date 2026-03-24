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
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{error}</div> : null}
      {status?.linked ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            MAX подключён. Команда `/stats` доступна в боте.
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleRefreshStatus} disabled={refreshing}>
            {refreshing ? 'Проверка…' : 'Обновить статус'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-600 text-sm">Подключите MAX для уведомлений по вашим промокодам и команды /stats.</p>
          {linkResult ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">Ссылка действительна {linkResult.expiresInMinutes} мин.</p>
              <a
                href={linkResult.startUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Открыть бота в MAX
              </a>
            </div>
          ) : (
            <Button type="button" onClick={handleConnect} disabled={creating}>
              {creating ? 'Создание ссылки…' : 'Подключить MAX'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
