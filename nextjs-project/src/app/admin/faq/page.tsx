'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/button'
import {
  getFaqItems,
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
} from '@/app/admin/faq/actions'

interface FaqItem {
  id: string
  question: string
  answer: string
  sortOrder: number
  isPublished: boolean
}

interface FaqFormState {
  question: string
  answer: string
  sortOrder: number
  isPublished: boolean
}

const initialForm: FaqFormState = {
  question: '',
  answer: '',
  sortOrder: 0,
  isPublished: true,
}

export default function AdminFaqPage() {
  const [items, setItems] = useState<FaqItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FaqFormState>(initialForm)

  useEffect(() => {
    void loadItems()
  }, [])

  async function loadItems() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getFaqItems()
      setItems(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить FAQ')
    } finally {
      setIsLoading(false)
    }
  }

  function resetEditor() {
    setEditingId(null)
    setIsCreating(false)
    setForm(initialForm)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      const payload = {
        question: form.question,
        answer: form.answer,
        sortOrder: form.sortOrder,
        isPublished: form.isPublished,
      }
      if (editingId) {
        const updated = await updateFaqItem(editingId, payload)
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await createFaqItem(payload)
        setItems((prev) => [created, ...prev])
      }
      resetEditor()
      await loadItems()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ошибка сохранения FAQ')
    }
  }

  function startEdit(item: FaqItem) {
    setIsCreating(false)
    setEditingId(item.id)
    setForm({
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
      isPublished: item.isPublished,
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить этот вопрос и ответ?')) return
    try {
      await deleteFaqItem(id)
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Ошибка удаления FAQ')
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-page-header">
        <h1>FAQ</h1>
        <p>Управление вопросами и ответами для страницы FAQ</p>
      </div>

      <div className="admin-content">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setIsCreating(true)
              setEditingId(null)
              setForm(initialForm)
            }}
          >
            Добавить вопрос
          </Button>
        </div>

        {(isCreating || editingId) && (
          <form onSubmit={handleSubmit} className="card mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Редактирование FAQ' : 'Новый FAQ'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Вопрос</label>
              <input
                className="form-input"
                value={form.question}
                onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ответ</label>
              <textarea
                className="form-input min-h-[120px]"
                value={form.answer}
                onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Порядок</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sortOrder: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 mt-7 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isPublished: event.target.checked }))
                  }
                />
                Опубликовано на сайте
              </label>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" type="submit">
                {editingId ? 'Сохранить' : 'Создать'}
              </Button>
              <Button variant="secondary" type="button" onClick={resetEditor}>
                Отмена
              </Button>
            </div>
          </form>
        )}

        <div className="card">
          {isLoading ? (
            <p className="text-gray-500">Загрузка...</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500">FAQ пока пуст.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="py-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.question}</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line mt-1">{item.answer}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        item.isPublished
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.isPublished ? 'Опубликовано' : 'Скрыто'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Порядок: {item.sortOrder}</span>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                        Редактировать
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => void handleDelete(item.id)}>
                        Удалить
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
