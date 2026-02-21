'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

const FIELDS: Array<{
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  group: 'cdek' | 'yookassa' | 'site';
}> = [
  { key: 'cdek_api_key', label: 'API-ключ СДЭК', type: 'password', placeholder: '••••••••', group: 'cdek' },
  { key: 'yookassa_shop_id', label: 'Shop ID ЮKassa', type: 'text', placeholder: 'Идентификатор магазина', group: 'yookassa' },
  { key: 'yookassa_secret_key', label: 'Секретный ключ ЮKassa', type: 'password', placeholder: '••••••••', group: 'yookassa' },
  { key: 'yookassa_term_id', label: 'Term ID ЮKassa (терминал)', type: 'text', placeholder: 'ID терминала при необходимости', group: 'yookassa' },
  { key: 'site_name', label: 'Название сайта', type: 'text', placeholder: 'Inner Health', group: 'site' },
  { key: 'site_contact_email', label: 'Email для связи', type: 'text', placeholder: 'info@example.com', group: 'site' },
  { key: 'default_currency', label: 'Валюта по умолчанию', type: 'text', placeholder: 'RUB', group: 'site' },
];

const GROUPS: Array<{ id: 'cdek' | 'yookassa' | 'site'; title: string }> = [
  { id: 'cdek', title: 'Доставка (СДЭК)' },
  { id: 'yookassa', title: 'Оплата (ЮKassa)' },
  { id: 'site', title: 'Общие настройки сайта' },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Не удалось загрузить настройки');
      const data = await res.json();
      setValues(data);
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
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось сохранить настройки');
      }
      const data = await res.json();
      setValues(data);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  }

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки сайта</h1>
        <p className="text-gray-500 mb-6">
          API-ключи и параметры доставки и оплаты. Секретные значения хранятся в базе и не отображаются после сохранения.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm">
            Настройки сохранены.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {GROUPS.map((group) => (
            <div key={group.id} className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{group.title}</h2>
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {FIELDS.filter((f) => f.group === group.id).map((field) => (
                  <div key={field.key}>
                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      id={field.key}
                      type={field.type}
                      className="form-input w-full"
                      placeholder={field.placeholder}
                      value={values[field.key] ?? ''}
                      onChange={(e) => updateValue(field.key, e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить настройки'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadSettings}
              disabled={saving}
            >
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
