'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

// Простой тип для промокода
interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
}

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    usageLimit: '',
    validFrom: '',
    validTo: '',
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/promo-codes');
      if (!response.ok) {
        throw new Error('Failed to fetch promo codes');
      }
      const data = await response.json();
      setPromoCodes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          validFrom: formData.validFrom || null,
          validTo: formData.validTo || null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create promo code');
      }
      
      // Обновляем список
      await fetchPromoCodes();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCode) return;
    
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCode.id,
          ...formData,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          validFrom: formData.validFrom || null,
          validTo: formData.validTo || null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update promo code');
      }
      
      // Обновляем список
      await fetchPromoCodes();
      setEditingCode(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот промокод?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete promo code');
      }
      
      // Удаляем из состояния
      setPromoCodes(promoCodes.filter(code => code.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (code: PromoCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      discountType: code.discountType,
      discountValue: code.discountValue,
      usageLimit: code.usageLimit?.toString() || '',
      validFrom: code.validFrom || '',
      validTo: code.validTo || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: 0,
      usageLimit: '',
      validFrom: '',
      validTo: '',
    });
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isActive }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update promo code');
      }
      
      // Обновляем состояние
      setPromoCodes(promoCodes.map(code =>
        code.id === id ? { ...code, isActive } : code
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded w-40 mb-8"></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-12 bg-gray-200"></div>
            <div className="p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded mb-2"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Промокоды</h1>
          <p className="text-gray-600 mt-1">Управление промокодами для скидок</p>
        </div>
        <Button variant="primary"
          onClick={() => {
            setShowForm(true);
            setEditingCode(null);
            resetForm();
          }}
        >
          <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Создать промокод
        </Button>
      </div>

      {showForm && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {editingCode ? 'Редактирование промокода' : 'Создание нового промокода'}
          </h2>
          <form onSubmit={editingCode ? handleUpdate : handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Код</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Тип скидки</label>
                <select
                  className="form-input"
                  value={formData.discountType}
                  onChange={(e) => setFormData({...formData, discountType: e.target.value as 'percentage' | 'fixed'})}
                >
                  <option value="percentage">Процент</option>
                  <option value="fixed">Фиксированная сумма</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Значение скидки</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Лимит использования (необязательно)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дата начала действия</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Дата окончания действия</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.validTo}
                  onChange={(e) => setFormData({...formData, validTo: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button variant="primary" type="submit">
                {editingCode ? 'Обновить' : 'Создать'}
              </Button>
              <Button variant="secondary" 
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCode(null);
                  resetForm();
                }}
              >
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}

      {promoCodes.length === 0 ? (
        <div className="card">
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Нет промокодов</h3>
            <p className="mt-1 text-sm text-gray-500">Создайте первый промокод, чтобы начать использовать скидки.</p>
            <div className="mt-6">
              <Button variant="primary"
                onClick={() => {
                  setShowForm(true);
                  setEditingCode(null);
                  resetForm();
                }}
              >
                Создать промокод
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-responsive overflow-x-auto">
            <table className="table table-horizontal min-w-[800px]">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Код
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Скидка
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Использовано
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действует
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-gray-900 text-center">
                      {code.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                      {code.discountType === 'percentage' ? 'Процент' : 'Фиксированная'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                      {code.discountType === 'percentage'
                        ? `${code.discountValue}%`
                        : `${code.discountValue} ₽`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                      <span className="inline-flex items-center justify-center">
                        {code.usedCount}
                        {code.usageLimit && (
                          <span className="ml-1 text-gray-400">/ {code.usageLimit}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        code.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {code.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                      <div className="flex flex-col items-center">
                        <span>{code.validFrom ? new Date(code.validFrom).toLocaleDateString('ru-RU') : '—'}</span>
                        <span className="text-gray-400 text-xs">{code.validTo ? new Date(code.validTo).toLocaleDateString('ru-RU') : '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium align-top text-center">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(code)}
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(code.id, !code.isActive)}
                        >
                          {code.isActive ? 'Отключить' : 'Включить'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(code.id)}
                        >
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
      )}
    </div>
  );
}