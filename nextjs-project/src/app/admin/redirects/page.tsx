'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import { ModalLayer } from '@/components/ui/modal-layer';

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

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface RedirectSuggestion {
  path: string;
  title: string;
  type: 'product' | 'category' | 'post' | 'seo-hub' | 'static';
  slug?: string;
  excerpt?: string | null;
  score: number;
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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestQuery, setSuggestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<RedirectSuggestion[]>([]);
  const [manualDestination, setManualDestination] = useState('');

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

  async function handleImportCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) {
      setError('Выберите CSV файл');
      return;
    }
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('csv', importFile);
      const res = await fetch('/api/admin/redirects/import', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка импорта');
      setImportResult({ created: data.created, skipped: data.skipped, errors: data.errors ?? [] });
      setImportFile(null);
      await fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  }

  async function fetchSuggestions(query: string) {
    const sourcePath = form.sourcePath.trim();
    if (!sourcePath) {
      setSuggestError('Сначала заполните путь-источник');
      setSuggestions([]);
      return;
    }

    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const params = new URLSearchParams({
        sourcePath,
        q: query,
        limit: '20',
      });
      const res = await fetch(`/api/admin/redirects/suggest?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить подсказки');
      setSuggestions(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'Не удалось загрузить подсказки');
    } finally {
      setSuggestLoading(false);
    }
  }

  function openSuggestModal() {
    const sourcePath = form.sourcePath.trim();
    if (!sourcePath) {
      setError('Сначала заполните путь-источник, затем подберите путь назначения');
      return;
    }
    setShowSuggestModal(true);
    setSuggestQuery('');
    setManualDestination(form.destination);
    void fetchSuggestions('');
  }

  function applyDestination(value: string) {
    const destination = value.trim();
    if (!destination) return;
    setForm((f) => ({ ...f, destination }));
    setShowSuggestModal(false);
  }

  useEffect(() => {
    if (!showSuggestModal) return;
    const timer = window.setTimeout(() => {
      void fetchSuggestions(suggestQuery.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [suggestQuery, showSuggestModal]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-text">Редиректы</h1>
        <Button onClick={openCreate} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          Добавить редирект
        </Button>
      </div>

      <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">Импорт из CSV</h2>
        <p className="text-sm text-gray-600 mb-4 wrap-break-word">
          Формат: <code className="bg-gray-200 px-1 rounded break-all">sourcePath,destination,statusCode,statusOnNew,note</code>. Первая строка может быть заголовком. Кодировка UTF-8.
        </p>
        <form onSubmit={handleImportCsv} className="flex flex-wrap items-end gap-4">
          <label className="flex w-full flex-col gap-1 sm:w-auto">
            <span className="text-sm font-medium text-gray-700">Файл CSV</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportResult(null);
              }}
            />
          </label>
          <Button type="submit" disabled={importing || !importFile} className="w-full sm:w-auto min-h-[44px]">
            {importing ? 'Импорт…' : 'Импортировать'}
          </Button>
        </form>
        {importResult && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-800 text-sm">
            Создано: {importResult.created}, пропущено (дубли): {importResult.skipped}
            {importResult.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-amber-700">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li>… и ещё {importResult.errors.length - 10} ошибок</li>
                )}
              </ul>
            )}
          </div>
        )}
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  required
                  placeholder="/ или /catalog или /product/slug"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                />
                <Button type="button" variant="secondary" onClick={openSuggestModal} disabled={saving}>
                  Подобрать
                </Button>
              </div>
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

      <ModalLayer
        open={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        lockBodyScroll
        panelClassName="max-w-3xl"
        dialogProps={{ 'aria-label': 'Подбор пути назначения' }}
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-text">Подбор пути назначения</h3>
            <p className="mt-1 text-sm text-gray-600">
              Источник: <span className="font-mono">{form.sourcePath || '—'}</span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Поиск по title / slug / path</span>
              <input
                type="text"
                placeholder="Например: коллаген или сустав"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={suggestQuery}
                onChange={(e) => setSuggestQuery(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Ручной ввод пути</span>
              <input
                type="text"
                placeholder="/news/slug"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={manualDestination}
                onChange={(e) => setManualDestination(e.target.value)}
              />
            </label>
          </div>

          {suggestError && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{suggestError}</div>}
          {suggestLoading && <p className="mb-3 text-sm text-gray-500">Ищем подходящие адреса…</p>}

          {!suggestLoading && suggestions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Рекомендуемый вариант</p>
              <button
                type="button"
                onClick={() => setManualDestination(suggestions[0].path)}
                className="w-full text-left rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 hover:bg-emerald-100"
              >
                <span className="block font-mono text-sm text-gray-900">{suggestions[0].path}</span>
                <span className="block text-xs text-gray-600">
                  {suggestions[0].title} • {suggestions[0].type}
                </span>
              </button>
            </div>
          )}

          {!suggestLoading && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Другие результаты</p>
              <div className="max-h-72 overflow-auto rounded-lg border border-gray-200">
                {suggestions.length <= 1 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Ничего не найдено, используйте ручной ввод.</p>
                ) : (
                  <ul>
                    {suggestions.slice(1).map((item) => (
                      <li key={`${item.path}-${item.type}`} className="border-b border-gray-100 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setManualDestination(item.path)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50"
                        >
                          <span className="block font-mono text-sm text-gray-900">{item.path}</span>
                          <span className="block text-xs text-gray-600">
                            {item.title} • {item.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowSuggestModal(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={() => applyDestination(manualDestination)}>
              Применить
            </Button>
          </div>
        </div>
      </ModalLayer>

      {loading ? (
        <p className="text-gray-500">Загрузка…</p>
      ) : list.length === 0 ? (
        <p className="text-gray-500">Редиректов пока нет. Добавьте первый — например, старый путь с Тильды и новый путь на сайте.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((row) => (
              <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow">
                <p className="text-xs text-gray-500">Источник</p>
                <p className="font-mono text-sm text-gray-900 break-all">{row.sourcePath}</p>
                <p className="mt-2 text-xs text-gray-500">Назначение</p>
                <p className="font-mono text-sm text-gray-900 break-all">{row.destination}</p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Код</span>
                  <span className="text-gray-900 font-medium">{row.statusCode}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Комментарий</span>
                  <span className="text-gray-900 text-right max-w-[65%] truncate">{row.note ?? '—'}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(row)} className="min-h-[40px] flex-1">
                    Изменить
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleDelete(row.id)} disabled={saving} className="min-h-[40px]">
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow">
            <div className="overflow-x-auto">
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
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
                        Изменить
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDelete(row.id)} disabled={saving}>
                        Удалить
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          </div>
        </>
      )}
    </div>
  );
}
