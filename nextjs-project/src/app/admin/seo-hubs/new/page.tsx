'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/button'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

const emptyDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Текст подборки. При необходимости скопируйте JSON из редактора новости.' }],
    },
  ],
}

export default function AdminSeoHubNewPage() {
  const base = useAdminBasePath()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [productSlugs, setProductSlugs] = useState('')
  const [contentJson, setContentJson] = useState(JSON.stringify(emptyDoc, null, 2))
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch('/api/admin/seo-hubs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
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
      const hub = await res.json()
      router.push(`/${base}/seo-hubs/${hub.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-content max-w-3xl">
        <Link href={`/${base}/seo-hubs`} className="text-sm text-action-blue hover:underline mb-4 inline-block">
          ← К списку хабов
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Новый SEO-хаб</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="авто из заголовка, если пусто"
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
              placeholder="collagen-vanilla, omega-3-1000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Контент (TipTap JSON)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm min-h-[240px]"
              value={contentJson}
              onChange={(e) => setContentJson(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="text-sm text-gray-700">Опубликован</span>
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Сохранение…' : 'Создать'}
          </Button>
        </form>
      </div>
    </div>
  )
}
