'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/button'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

interface SeoHubDetail {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: unknown
  productSlugs: string[]
  published: boolean
}

export default function AdminSeoHubEditPage() {
  const base = useAdminBasePath()
  const router = useRouter()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  const [hub, setHub] = useState<SeoHubDetail | null>(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [productSlugs, setProductSlugs] = useState('')
  const [contentJson, setContentJson] = useState('{}')
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      try {
        const res = await fetch(`/api/admin/seo-hubs/${id}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Не найдено')
        const data = (await res.json()) as SeoHubDetail
        setHub(data)
        setTitle(data.title)
        setSlug(data.slug)
        setExcerpt(data.excerpt ?? '')
        setProductSlugs(data.productSlugs.join(', '))
        setContentJson(JSON.stringify(data.content, null, 2))
        setPublished(data.published)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    let content: unknown
    try {
      content = JSON.parse(contentJson) as unknown
    } catch {
      setError('Некорректный JSON контента')
      return
    }
    const slugs = productSlugs
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/seo-hubs/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || null,
          content,
          productSlugs: slugs,
          published,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(typeof j.error === 'string' ? j.error : 'Ошибка сохранения')
      }
      const updated = (await res.json()) as SeoHubDetail
      setHub(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-container p-8">
        <p className="text-gray-500">Загрузка…</p>
      </div>
    )
  }

  if (!hub && !loading) {
    return (
      <div className="admin-container p-8">
        <p className="text-red-600">{error ?? 'Не найдено'}</p>
        <Link href={`/${base}/seo-hubs`}>← Назад</Link>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-content max-w-3xl">
        <Link href={`/${base}/seo-hubs`} className="text-sm text-action-blue hover:underline mb-4 inline-block">
          ← К списку хабов
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Редактирование хаба</h1>
        {hub?.published && (
          <p className="text-sm text-gray-600 mb-6">
            URL на сайте:{' '}
            <code className="bg-gray-100 px-1 rounded">/guides/{hub.slug}</code>
          </p>
        )}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Краткое описание</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[80px]"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slugи товаров через запятую</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={productSlugs}
              onChange={(e) => setProductSlugs(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Контент (TipTap JSON)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm min-h-[280px]"
              value={contentJson}
              onChange={(e) => setContentJson(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="text-sm text-gray-700">Опубликован</span>
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/${base}/seo-hubs`)}>
              Закрыть
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
