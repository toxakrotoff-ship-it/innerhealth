'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

interface RedirectRow {
  id: string;
  sourcePath: string;
  destination: string;
  statusCode: number;
  entityType: string | null;
  entityId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 301, label: '301 Moved Permanently (рекомендуется для Тилды/рекламы)' },
  { value: 302, label: '302 Found (временный)' },
  { value: 307, label: '307 Temporary Redirect' },
  { value: 308, label: '308 Permanent Redirect' },
];

export default function AdminRedirectsPage() {
  const [list, setList] = useState<RedirectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RedirectRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sourcePath: '',
    destination: '',
    statusCode: 301,
    note: '',
  });

  async function fetchList() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/redirects');
      if (!res.ok) throw new Error('Не удалось загрузить список');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ sourcePath: '', destination: '', statusCode: 301, note: '' });
    setShowForm(true);
  }

  function openEdit(row: RedirectRow) {
    setEditing(row);
    setForm({
      sourcePath: row.sourcePath,
      destination: row.destination,
      statusCode: row.statusCode,
      note: row.note ?? '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sourcePath: form.sourcePath.trim(),
        destination: form.destination.trim(),
        statusCode: form.statusCode,
        note: form.note.trim() || null,
      };
      if (editing) {
        const res = await fetch(`/api/admin/redirects/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Ошибка сохранения');
        }
      } else {
        const res = await fetch('/api/admin/redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Ошибка создания');
        }
      }
      await fetchList();
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот редирект?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/redirects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Не удалось удалить');
      await fetchList();
      if (editing?.id === id) closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text">Редиректы</h1>
        <Button onClick={openCreate} disabled={saving}>
          Добавить редирект
        </Button>
      </div>

      <p className="text-gray-600 mb-6">
        Настройка редиректов со старых URL (Тильда и др.) на текущий сайт. По умолчанию используется код <strong>301</strong> (постоянный) — удобно для рекламы и SEO.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">{editing ? 'Редактировать' : 'Новый редирект'}</h2>
          <div className="grid gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Путь-источник (старый URL без домена)</label>
              <input
                type="text"
                required
                placeholder="/page12345 или /magazin"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.sourcePath}
                onChange={(e) => setForm((f) => ({ ...f, sourcePath: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Путь назначения</label>
              <input
                type="text"
                required
                placeholder="/ или /catalog или /product/slug"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Код ответа (HTTP status)</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.statusCode}
                onChange={(e) => setForm((f) => ({ ...f, statusCode: Number(e.target.value) }))}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий (необязательно)</label>
              <input
                type="text"
                placeholder="Например: главная с Тильды"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {editing ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm} disabled={saving}>
                Отмена
              </Button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">Редиректов пока нет. Добавьте первый — например, старый путь с Тильды и новый путь на сайте.</p>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Источник</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Назначение</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Комментарий</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {list.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">{row.sourcePath}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-800">{row.destination}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.statusCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{row.note ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(row)} className="mr-2">
                      Изменить
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleDelete(row.id)} disabled={saving}>
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
