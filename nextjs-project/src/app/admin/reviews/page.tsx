'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Review {
  id: string;
  authorName: string;
  socialLink: string | null;
  text: string;
  imageUrl: string | null;
  status: ReviewStatus;
  createdAt: string;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'На модерации',
  APPROVED: 'Опубликован',
  REJECTED: 'Отклонён',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/reviews', { credentials: 'include' });
      if (!res.ok) throw new Error('Не удалось загрузить отзывы');
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const setStatus = async (id: string, status: 'approved' | 'rejected') => {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Ошибка');
      }
      await fetchReviews();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActingId(null);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Удалить этот отзыв безвозвратно?')) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setActingId(null);
    }
  };

  const filtered =
    statusFilter === 'all'
      ? reviews
      : reviews.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка отзывов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Модерация отзывов</h1>
        <p className="text-gray-500 mb-6">
          Отзывы с формы на сайте. Статус обновляется и при действиях в Telegram-боте — обновите страницу или список.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {key === 'all' ? 'Все' : STATUS_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table table-horizontal">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Автор
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Текст
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">
                    Фото
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Нет отзывов
                    </td>
                  </tr>
                ) : (
                  filtered.map((review) => {
                    const busy = actingId === review.id;
                    return (
                      <tr key={review.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(review.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium text-gray-900">{review.authorName}</span>
                          {review.socialLink && (
                            <>
                              <br />
                              <a
                                href={review.socialLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-action-blue hover:underline text-xs break-all"
                              >
                                {truncate(review.socialLink, 30)}
                              </a>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          {truncate(review.text, 120)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              review.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : review.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {STATUS_LABELS[review.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {review.imageUrl ? (
                            <a
                              href={review.imageUrl.startsWith('/') ? review.imageUrl : `/${review.imageUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-10 h-10 rounded overflow-hidden border border-gray-200 bg-gray-50"
                            >
                              <img
                                src={review.imageUrl.startsWith('/') ? review.imageUrl : `/${review.imageUrl}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {review.status !== 'APPROVED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={busy}
                                onClick={() => setStatus(review.id, 'approved')}
                              >
                                Опубликовать
                              </Button>
                            )}
                            {review.status !== 'REJECTED' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busy}
                                onClick={() => setStatus(review.id, 'rejected')}
                              >
                                Отклонить
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => deleteReview(review.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Удалить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
