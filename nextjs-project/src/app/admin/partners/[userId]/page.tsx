'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/button';

interface Binding {
  id: string;
  promoCodeId: string;
  code: string;
  commissionPercent: number;
  createdAt: string;
}

interface StatRow {
  promoCodeId: string;
  code: string;
  ordersCount: number;
  totalAmount: number;
}

interface PromoOption {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  usedCount: number;
}

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [partner, setPartner] = useState<{
    id: string;
    email: string;
    name: string | null;
    partnerIncomeBase?: 'order_total' | 'discount_amount';
  } | null>(null);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);
  const [allPromos, setAllPromos] = useState<PromoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [partnerIncomeBase, setPartnerIncomeBase] = useState<'order_total' | 'discount_amount'>('order_total');
  const [savingIncomeBase, setSavingIncomeBase] = useState(false);

  const [addPromoId, setAddPromoId] = useState('');
  const [addPercent, setAddPercent] = useState(10);
  const [createCode, setCreateCode] = useState('');
  const [createType, setCreateType] = useState<'percentage' | 'fixed'>('percentage');
  const [createValue, setCreateValue] = useState(10);
  const [createPercent, setCreatePercent] = useState(10);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState(0);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const [usersRes, bindingsRes, statsRes, promosRes] = await Promise.all([
        fetch('/api/admin/users?role=PARTNER', { credentials: 'include' }),
        fetch(`/api/admin/partners/${userId}/promo-codes`, { credentials: 'include' }),
        fetch(`/api/admin/partners/${userId}/stats`, { credentials: 'include' }),
        fetch('/api/admin/promo-codes', { credentials: 'include' }),
      ]);
      if (!usersRes.ok || !bindingsRes.ok || !statsRes.ok) {
        if (usersRes.status === 404 || bindingsRes.status === 404 || statsRes.status === 404) {
          setPartner(null);
          setBindings([]);
          setStats([]);
          return;
        }
        throw new Error('Не удалось загрузить данные');
      }
      const usersList = await usersRes.json();
      const p = usersList.find((u: { id: string }) => u.id === userId);
      setPartner(p ?? null);
      setPartnerIncomeBase(p?.partnerIncomeBase ?? 'order_total');
      setBindings(await bindingsRes.json());
      setStats(await statsRes.json());
      const promos = await promosRes.json();
      setAllPromos(promos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statsByPromoId = Object.fromEntries(
    stats.map((s) => [s.promoCodeId, { ordersCount: s.ordersCount, totalAmount: s.totalAmount }])
  );

  const assignedPromoIds = new Set(bindings.map((b) => b.promoCodeId));
  const availablePromos = allPromos.filter((pr) => !assignedPromoIds.has(pr.id));

  async function handleSaveIncomeBase() {
    setError(null);
    setSavingIncomeBase(true);
    try {
      const res = await fetch(`/api/admin/partners/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerIncomeBase }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось сохранить');
      setPartner((prev) => (prev ? { ...prev, partnerIncomeBase } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSavingIncomeBase(false);
    }
  }

  async function handleAssign() {
    if (!addPromoId || addPercent < 0 || addPercent > 100) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${userId}/promo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCodeId: addPromoId, commissionPercent: addPercent }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось привязать');
      setAddPromoId('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function handleCreateAndAssign() {
    const code = createCode.trim();
    if (!code || createValue < 0 || createPercent < 0 || createPercent > 100) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${userId}/promo-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPromo: true,
          code,
          discountType: createType,
          discountValue: createValue,
          commissionPercent: createPercent,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось создать и привязать');
      setCreateCode('');
      setCreateValue(10);
      setCreatePercent(10);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function handleUpdatePercent(bindingId: string, commissionPercent: number) {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/partners/${userId}/promo-codes/${bindingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commissionPercent }),
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось обновить');
      }
      setEditId(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function handleUnbind(bindingId: string) {
    if (!window.confirm('Отвязать промокод от партнёра?')) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/partners/${userId}/promo-codes/${bindingId}`,
        { method: 'DELETE', credentials: 'include' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось отвязать');
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6" />
          <div className="h-32 bg-gray-200 rounded mb-4" />
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600">Партнёр не найден или у пользователя нет роли «Партнёр».</p>
        <Link href="/admin/partners" className="mt-4 inline-block text-blue-600 hover:underline">
          ← К списку партнёров
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/partners" className="text-sm text-blue-600 hover:underline">
          ← Партнёры
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {partner.name || partner.email}
      </h1>
      <p className="text-gray-600 text-sm">{partner.email}</p>

      {error && (
        <div className="mt-4 mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <section className="card mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Расчёт дохода партнёра</h2>
        <p className="text-sm text-gray-500 mb-4">От какой базы считать процент дохода по промокодам для этого партнёра.</p>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Доход считать от</label>
            <select
              className="form-input w-full min-w-0 sm:min-w-[280px]"
              value={partnerIncomeBase}
              onChange={(e) => setPartnerIncomeBase(e.target.value as 'order_total' | 'discount_amount')}
            >
              <option value="order_total">От суммы заказов (корзина с промокодом)</option>
              <option value="discount_amount">От суммы скидок по промокоду</option>
            </select>
          </div>
          <Button
            variant="primary"
            type="button"
            onClick={handleSaveIncomeBase}
            disabled={savingIncomeBase}
            className="min-h-[44px] w-full sm:w-auto"
          >
            {savingIncomeBase ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </div>
      </section>

      <section className="card mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Привязанные промокоды</h2>
        {bindings.length === 0 ? (
          <p className="text-sm text-gray-500">Нет привязанных промокодов.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {bindings.map((b) => {
                const s = statsByPromoId[b.promoCodeId]
                const isEditing = editId === b.id
                return (
                  <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base font-semibold text-gray-900">{b.code}</p>
                      {!isEditing && (
                        <button
                          type="button"
                          className="text-red-600 text-sm hover:underline"
                          onClick={() => handleUnbind(b.id)}
                        >
                          Отвязать
                        </button>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-gray-600">Заказов</span>
                      <span className="text-right text-gray-900">{s?.ordersCount ?? 0}</span>
                      <span className="text-gray-600">Сумма выкупа</span>
                      <span className="text-right text-gray-900">
                        {s?.totalAmount != null
                          ? new Intl.NumberFormat('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              maximumFractionDigits: 0,
                            }).format(s.totalAmount)
                          : '—'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-1">% дохода</p>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            className="form-input w-24 text-sm"
                            value={editPercent}
                            onChange={(e) => setEditPercent(Number(e.target.value))}
                          />
                          <button
                            type="button"
                            className="text-blue-600 text-sm"
                            onClick={() => handleUpdatePercent(b.id, editPercent)}
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            className="text-gray-500 text-sm"
                            onClick={() => setEditId(null)}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{b.commissionPercent}%</span>
                          <button
                            type="button"
                            className="text-blue-600 text-xs"
                            onClick={() => {
                              setEditId(b.id)
                              setEditPercent(b.commissionPercent)
                            }}
                          >
                            Изменить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
            <table className="table table-horizontal min-w-[500px]">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">% дохода</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Заказов</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Сумма выкупа</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((b) => {
                  const s = statsByPromoId[b.promoCodeId];
                  const isEditing = editId === b.id;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{b.code}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              className="form-input w-20 text-sm"
                              value={editPercent}
                              onChange={(e) => setEditPercent(Number(e.target.value))}
                            />
                            <button
                              type="button"
                              className="text-blue-600 text-sm"
                              onClick={() => handleUpdatePercent(b.id, editPercent)}
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              className="text-gray-500 text-sm"
                              onClick={() => setEditId(null)}
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <>
                            {b.commissionPercent}%
                            <button
                              type="button"
                              className="ml-2 text-blue-600 text-xs"
                              onClick={() => {
                                setEditId(b.id);
                                setEditPercent(b.commissionPercent);
                              }}
                            >
                              Изменить
                            </button>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{s?.ordersCount ?? 0}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {s?.totalAmount != null
                          ? new Intl.NumberFormat('ru-RU', {
                              style: 'currency',
                              currency: 'RUB',
                              maximumFractionDigits: 0,
                            }).format(s.totalAmount)
                          : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          className="text-red-600 text-sm hover:underline"
                          onClick={() => handleUnbind(b.id)}
                        >
                          Отвязать
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>

      <section className="card mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Добавить промокод</h2>
        <p className="text-sm text-gray-500 mb-4">Выберите существующий промокод и укажите процент дохода партнёра.</p>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Промокод</label>
            <select
              className="form-input w-full min-w-0 sm:min-w-[180px]"
              value={addPromoId}
              onChange={(e) => setAddPromoId(e.target.value)}
            >
              <option value="">— Выберите —</option>
              {availablePromos.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.code}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">% дохода</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="form-input w-full sm:w-24"
              value={addPercent}
              onChange={(e) => setAddPercent(Number(e.target.value))}
            />
          </div>
          <Button
            variant="primary"
            type="button"
            onClick={handleAssign}
            disabled={!addPromoId}
            className="min-h-[44px] w-full sm:w-auto"
          >
            Привязать
          </Button>
        </div>
      </section>

      <section className="card mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Создать промокод и привязать</h2>
        <p className="text-sm text-gray-500 mb-4">Создайте новый промокод и сразу привяжите его к партнёру с процентом дохода.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Код промокода *</label>
            <input
              type="text"
              className="form-input"
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              placeholder="SUMMER20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип скидки</label>
            <select
              className="form-input"
              value={createType}
              onChange={(e) => setCreateType(e.target.value as 'percentage' | 'fixed')}
            >
              <option value="percentage">Процент</option>
              <option value="fixed">Фиксированная</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Значение скидки</label>
            <input
              type="number"
              min={0}
              step={createType === 'percentage' ? 1 : 0.01}
              className="form-input"
              value={createValue}
              onChange={(e) => setCreateValue(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">% дохода партнёра</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="form-input"
              value={createPercent}
              onChange={(e) => setCreatePercent(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          variant="primary"
          type="button"
          onClick={handleCreateAndAssign}
          disabled={!createCode.trim()}
        >
          Создать и привязать
        </Button>
      </section>
    </div>
  );
}
