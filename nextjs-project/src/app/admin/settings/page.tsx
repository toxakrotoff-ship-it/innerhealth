'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

interface AdminMailbox {
  id: string;
  email: string;
  name: string;
  notificationEmail: string | null;
}

interface AdminTelegram {
  id: string;
  email: string;
  name: string;
  telegramUserId: string | null;
  linkedAt: string | null;
}

/** Коды НДС для чеков 54-ФЗ (справочник ЮKassa). */
const VAT_CODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Без НДС' },
  { value: '2', label: 'НДС 0%' },
  { value: '3', label: 'НДС 10%' },
  { value: '4', label: 'НДС 20%' },
  { value: '5', label: 'НДС 10/110' },
  { value: '6', label: 'НДС 20/120' },
  { value: '7', label: 'НДС 5%' },
  { value: '8', label: 'НДС 7%' },
  { value: '9', label: 'НДС 5/105' },
  { value: '10', label: 'НДС 7/107' },
  { value: '11', label: 'НДС 22%' },
  { value: '12', label: 'НДС 22/122' },
];

const FIELDS: Array<{
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder?: string;
  group: 'cdek' | 'yookassa' | 'site';
  options?: Array<{ value: string; label: string }>;
}> = [
  { key: 'cdek_api_key', label: 'API-ключ СДЭК', type: 'password', placeholder: '••••••••', group: 'cdek' },
  { key: 'cdek_sender_name', label: 'Имя отправителя (СДЭК)', type: 'text', placeholder: 'Название компании или ФИО', group: 'cdek' },
  { key: 'cdek_sender_phone', label: 'Телефон отправителя (СДЭК)', type: 'text', placeholder: '+7 (999) 123-45-67', group: 'cdek' },
  { key: 'cdek_sender_address', label: 'Адрес отправителя (СДЭК)', type: 'text', placeholder: 'Город, улица, дом', group: 'cdek' },
  { key: 'cdek_from_city_code', label: 'Код города отправления СДЭК', type: 'text', placeholder: '44', group: 'cdek' },
  { key: 'yookassa_shop_id', label: 'Shop ID ЮKassa', type: 'text', placeholder: 'Идентификатор магазина', group: 'yookassa' },
  { key: 'yookassa_secret_key', label: 'Секретный ключ ЮKassa', type: 'password', placeholder: '••••••••', group: 'yookassa' },
  { key: 'yookassa_term_id', label: 'Term ID ЮKassa (терминал)', type: 'text', placeholder: 'ID терминала при необходимости', group: 'yookassa' },
  { key: 'yookassa_receipt_vat_code', label: 'НДС чека (товары)', type: 'select', group: 'yookassa', options: VAT_CODE_OPTIONS },
  { key: 'yookassa_receipt_vat_code_delivery', label: 'НДС чека (доставка)', type: 'select', group: 'yookassa', options: VAT_CODE_OPTIONS },
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
  const [admins, setAdmins] = useState<AdminMailbox[] | null>(null);
  const [telegramList, setTelegramList] = useState<AdminTelegram[] | null>(null);
  const [mailboxEdit, setMailboxEdit] = useState<Record<string, string>>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [unlinkingUserId, setUnlinkingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadAdmins();
    loadTelegram();
  }, []);

  async function loadAdmins() {
    try {
      const res = await fetch('/api/admin/settings/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch {
      setAdmins(null);
    }
  }

  async function loadTelegram() {
    try {
      const res = await fetch('/api/admin/settings/telegram');
      if (res.ok) {
        const data = await res.json();
        setTelegramList(data);
      }
    } catch {
      setTelegramList(null);
    }
  }

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
          API-ключи и параметры доставки и оплаты. Для оплаты корзины используются Shop ID и секретный ключ ЮKassa из этого раздела; чек 54-ФЗ формируется с выбранными ставками НДС для товаров и доставки. Секретные значения хранятся в базе и не отображаются после сохранения.
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
                    {field.type === 'select' && field.options ? (
                      <select
                        id={field.key}
                        className="form-input w-full"
                        value={(values[field.key] || (field.key === 'yookassa_receipt_vat_code' || field.key === 'yookassa_receipt_vat_code_delivery' ? '1' : ''))}
                        onChange={(e) => updateValue(field.key, e.target.value)}
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={field.key}
                        type={field.type}
                        className="form-input w-full"
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={(e) => updateValue(field.key, e.target.value)}
                        autoComplete="off"
                      />
                    )}
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

        {admins !== null && admins.length > 0 && (
          <div className="card mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Почтовые ящики администраторов</h2>
            <p className="text-sm text-gray-600 mb-4">
              Уведомления о новых заказах отправляются с support@innerhealth.ru. По умолчанию — на email входа. Можно привязать отдельный ящик для уведомлений.
            </p>
            <div className="overflow-x-auto">
              <table className="table table-horizontal min-w-[500px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Логин</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Привязанный ящик</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-900">{a.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {a.notificationEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="email"
                            className="form-input text-sm w-44"
                            placeholder="email для уведомлений"
                            value={mailboxEdit[a.id] ?? ''}
                            onChange={(e) => setMailboxEdit((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={updatingUserId !== null}
                            onClick={async () => {
                              const value = (mailboxEdit[a.id] ?? '').trim();
                              setUpdatingUserId(a.id);
                              try {
                                const res = await fetch('/api/admin/settings/admins', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    userId: a.id,
                                    notificationEmail: value || null,
                                  }),
                                });
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}));
                                  throw new Error(data.error || 'Ошибка');
                                }
                                setMailboxEdit((prev) => {
                                  const next = { ...prev };
                                  delete next[a.id];
                                  return next;
                                });
                                await loadAdmins();
                              } catch (e) {
                                setError(e instanceof Error ? e.message : 'Ошибка');
                              } finally {
                                setUpdatingUserId(null);
                              }
                            }}
                          >
                            {a.notificationEmail ? 'Изменить' : 'Привязать'}
                          </Button>
                          {a.notificationEmail && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={updatingUserId !== null}
                              onClick={async () => {
                                setUpdatingUserId(a.id);
                                try {
                                  const res = await fetch('/api/admin/settings/admins', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: a.id, notificationEmail: null }),
                                  });
                                  if (!res.ok) throw new Error('Ошибка');
                                  setMailboxEdit((prev) => {
                                    const next = { ...prev };
                                    delete next[a.id];
                                    return next;
                                  });
                                  await loadAdmins();
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Ошибка');
                                } finally {
                                  setUpdatingUserId(null);
                                }
                              }}
                            >
                              Отвязать
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {telegramList !== null && (
          <div className="card mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Telegram администраторов</h2>
            <p className="text-sm text-gray-600 mb-4">
              Привязанные аккаунты Telegram для уведомлений о заказах. Управление привязкой — в профиле пользователя или через бота.
            </p>
            {telegramList.length === 0 ? (
              <p className="text-sm text-gray-500">Нет администраторов с привязанным Telegram.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-horizontal min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telegram ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Привязан</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telegramList.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-gray-500 ml-1">({t.email})</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{t.telegramUserId ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {t.linkedAt
                            ? new Date(t.linkedAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {t.telegramUserId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={unlinkingUserId !== null}
                              onClick={async () => {
                                if (!confirm('Отвязать Telegram у этого пользователя?')) return;
                                setUnlinkingUserId(t.id);
                                try {
                                  const res = await fetch(
                                    `/api/admin/settings/telegram?userId=${encodeURIComponent(t.id)}`,
                                    { method: 'DELETE' }
                                  );
                                  if (!res.ok) {
                                    const data = await res.json().catch(() => ({}));
                                    throw new Error(data.error || 'Ошибка');
                                  }
                                  await loadTelegram();
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : 'Ошибка');
                                } finally {
                                  setUnlinkingUserId(null);
                                }
                              }}
                            >
                              {unlinkingUserId === t.id ? '…' : 'Отвязать'}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
