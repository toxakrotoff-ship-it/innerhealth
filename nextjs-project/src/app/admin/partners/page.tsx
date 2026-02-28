'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PartnerUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  promoCodes?: { id: string; code: string; commissionPercent: number }[];
  ordersCount?: number;
  totalRevenue?: number;
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<PartnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/users?role=PARTNER', {
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось загрузить партнёров');
      }
      const data = await response.json();
      setPartners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Партнёры</h1>
        <p className="text-gray-600 mt-1">
          Управление партнёрами и привязками промокодов
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {partners.length === 0 ? (
        <div className="card">
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">Нет пользователей с ролью «Партнёр».</p>
            <p className="text-sm text-gray-500 mt-1">
              Назначьте роль «Партнёр» в разделе{' '}
              <Link href="/admin/users" className="text-blue-600 hover:underline">
                Пользователи
              </Link>
              .
            </p>
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
                    Промокодов
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Заказов
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма выкупа
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {p.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.promoCodes?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.ordersCount ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {p.totalRevenue != null
                        ? new Intl.NumberFormat('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                            maximumFractionDigits: 0,
                          }).format(p.totalRevenue)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/admin/partners/${p.id}`}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        Настроить
                      </Link>
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
