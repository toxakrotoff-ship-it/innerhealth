'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/button'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

interface SeoHubRow {
  id: string
  slug: string
  title: string
  published: boolean
  updatedAt: string
}

export default function AdminSeoHubsPage() {
  const base = useAdminBasePath()
  const [hubs, setHubs] = useState<SeoHubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/seo-hubs', { credentials: 'include' })
        if (!res.ok) throw new Error('Ошибка загрузки')
        const data = await res.json()
        setHubs(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Удалить хаб?')) return
    try {
      const res = await fetch(`/api/admin/seo-hubs/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Ошибка удаления')
      setHubs((prev) => prev.filter((h) => h.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SEO-хабы</h1>
          <Link href={`/${base}/seo-hubs/new`}>
            <Button variant="primary">Создать хаб</Button>
          </Link>
        </div>
        <p className="text-gray-600 mb-6 text-sm max-w-2xl">
          Подборочные страницы на сайте: <code className="bg-gray-100 px-1 rounded">/guides/ваш-slug</code>.
          Контент — JSON редактора TipTap (как у новостей). Slugи товаров через запятую.
        </p>
        {loading && <p className="text-gray-500">Загрузка…</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && hubs.length === 0 && <p className="text-gray-500">Пока нет хабов.</p>}
        <ul className="space-y-2">
          {hubs.map((h) => (
            <li
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <span className="font-medium text-gray-900">{h.title}</span>
                <span className="text-gray-500 text-sm ml-2">/{h.slug}</span>
                {!h.published && (
                  <span className="ml-2 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">черновик</span>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/${base}/seo-hubs/${h.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Редактировать
                  </Button>
                </Link>
                <Button variant="secondary" size="sm" onClick={() => void handleDelete(h.id)}>
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
