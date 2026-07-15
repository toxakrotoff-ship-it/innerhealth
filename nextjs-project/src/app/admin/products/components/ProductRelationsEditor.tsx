'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ProductRelationType } from '@prisma/client'
import { PRODUCT_RELATION_TYPE_OPTIONS } from '@/lib/product-relations'

type AdminBrand = 'inner' | 'sprint-power'

interface ProductRelationSuggestion {
  id: string
  title: string
  slug: string | null
  sku: string | null
  photo: string | null
  isDraft: boolean
  brand: string | null
}

interface AdminProductRelation {
  id: string
  relationType: ProductRelationType
  sortOrder: number
  isPublished: boolean
  targetProduct: {
    id: string
    title: string
    slug: string | null
    sku: string | null
    photo: string | null
    isDraft: boolean
    brand: string | null
  }
}

interface ProductRelationsEditorProps {
  sourceProductId?: string | null
  activeBrand: AdminBrand | null
}

export function ProductRelationsEditor({
  sourceProductId,
  activeBrand,
}: ProductRelationsEditorProps) {
  const [relations, setRelations] = useState<AdminProductRelation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ProductRelationSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProductRelationSuggestion | null>(null)
  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [relationType, setRelationType] = useState<ProductRelationType>('RECOMMENDED')
  const [sortOrder, setSortOrder] = useState('0')
  const [isPublished, setIsPublished] = useState(true)

  const existingRelationKeySet = useMemo(
    () => new Set(relations.map((relation) => `${relation.targetProduct.id}:${relation.relationType}`)),
    [relations]
  )

  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          suggestion.id !== sourceProductId &&
          !existingRelationKeySet.has(`${suggestion.id}:${relationType}`)
      ),
    [existingRelationKeySet, relationType, sourceProductId, suggestions]
  )

  useEffect(() => {
    if (!sourceProductId) return

    let cancelled = false

    async function loadRelations() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/admin/product-relations?sourceProductId=${encodeURIComponent(sourceProductId)}`,
          { credentials: 'include' }
        )
        const data = (await response.json().catch(() => [])) as
          | AdminProductRelation[]
          | { error?: string }

        if (!response.ok) {
          throw new Error(
            'error' in data && typeof data.error === 'string'
              ? data.error
              : 'Не удалось загрузить связи товара'
          )
        }

        if (!cancelled) {
          setRelations(Array.isArray(data) ? data : [])
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Не удалось загрузить связи товара'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadRelations()

    return () => {
      cancelled = true
    }
  }, [sourceProductId])

  useEffect(() => {
    if (!sourceProductId) return

    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/product-relations/suggest?q=${encodeURIComponent(
            normalizedQuery
          )}&sourceProductId=${encodeURIComponent(sourceProductId)}&limit=8`,
          {
            credentials: 'include',
            signal: controller.signal,
          }
        )
        const data = (await response.json().catch(() => [])) as ProductRelationSuggestion[]
        if (!response.ok) throw new Error('Не удалось загрузить подсказки')
        setSuggestions(Array.isArray(data) ? data : [])
      } catch (suggestError) {
        if (controller.signal.aborted) return
        console.error('product relation suggest', suggestError)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [query, sourceProductId])

  async function createRelation() {
    if (!sourceProductId || !selectedSuggestion) return

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-relations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProductId,
          targetProductId: selectedSuggestion.id,
          relationType,
          sortOrder: Number.parseInt(sortOrder || '0', 10) || 0,
          isPublished,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать связь')
      }

      setQuery('')
      setSuggestions([])
      setSelectedSuggestion(null)
      setSortOrder('0')

      const reload = await fetch(
        `/api/admin/product-relations?sourceProductId=${encodeURIComponent(sourceProductId)}`,
        { credentials: 'include' }
      )
      const list = (await reload.json().catch(() => [])) as AdminProductRelation[]
      setRelations(Array.isArray(list) ? list : [])
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Не удалось создать связь')
    } finally {
      setCreating(false)
    }
  }

  async function patchRelation(id: string, patch: Partial<AdminProductRelation>) {
    setSavingId(id)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-relations', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          relationType: patch.relationType,
          sortOrder: patch.sortOrder,
          isPublished: patch.isPublished,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить связь')
      }

      setRelations((prev) =>
        prev.map((relation) =>
          relation.id === id
            ? {
                ...relation,
                ...patch,
              }
            : relation
        )
      )
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : 'Не удалось обновить связь')
    } finally {
      setSavingId(null)
    }
  }

  async function removeRelation(id: string) {
    setDeletingId(id)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-relations', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить связь')
      }

      setRelations((prev) => prev.filter((relation) => relation.id !== id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить связь')
    } finally {
      setDeletingId(null)
    }
  }

  if (!sourceProductId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        Связи товаров появятся после первого сохранения товара.
      </div>
    )
  }

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Связи товаров</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Подбирайте ручные рекомендации, альтернативы и cross-sell внутри бренда{' '}
          <span className="font-medium">{activeBrand === 'sprint-power' ? 'Sprint Power' : 'Inner Health'}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(180px,0.8fr)_120px_auto]">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Найти товар</label>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelectedSuggestion(null)
            }}
            className="form-input w-full"
            placeholder="Название, slug или SKU"
          />
          {visibleSuggestions.length > 0 ? (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
              {visibleSuggestions.map((suggestion) => {
                const isSelected = selectedSuggestion?.id === suggestion.id
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      setSelectedSuggestion(suggestion)
                      setQuery(suggestion.title)
                      setSuggestions([])
                    }}
                    className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900">{suggestion.title}</span>
                      <span className="block text-xs text-gray-500">
                        {suggestion.sku?.trim() ? `SKU: ${suggestion.sku}` : 'SKU не указан'}
                        {suggestion.slug ? ` · /product/${suggestion.slug}` : ''}
                      </span>
                    </span>
                    {suggestion.isDraft ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        draft
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Тип связи</label>
          <select
            value={relationType}
            onChange={(event) => setRelationType(event.target.value as ProductRelationType)}
            className="form-input w-full"
          >
            {PRODUCT_RELATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Порядок</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="form-input w-full"
          />
        </div>

        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Опубликовано
          </label>
          <button
            type="button"
            onClick={() => void createRelation()}
            disabled={!selectedSuggestion || creating}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {creating ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Загрузка связей...</p>
      ) : relations.length === 0 ? (
        <p className="text-sm text-gray-500">Пока нет ни одной ручной связи.</p>
      ) : (
        <div className="space-y-3">
          {relations.map((relation) => (
            <div
              key={relation.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.8fr)_110px_auto_auto]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{relation.targetProduct.title}</p>
                <p className="truncate text-xs text-gray-500">
                  {relation.targetProduct.sku?.trim()
                    ? `SKU: ${relation.targetProduct.sku}`
                    : 'SKU не указан'}
                  {relation.targetProduct.slug ? ` · /product/${relation.targetProduct.slug}` : ''}
                </p>
              </div>

              <select
                value={relation.relationType}
                onChange={(event) =>
                  void patchRelation(relation.id, {
                    relationType: event.target.value as ProductRelationType,
                  })
                }
                disabled={savingId === relation.id}
                className="form-input w-full"
              >
                {PRODUCT_RELATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                defaultValue={relation.sortOrder}
                onBlur={(event) => {
                  const nextSortOrder = Number.parseInt(event.target.value || '0', 10) || 0
                  if (nextSortOrder !== relation.sortOrder) {
                    void patchRelation(relation.id, { sortOrder: nextSortOrder })
                  }
                }}
                disabled={savingId === relation.id}
                className="form-input w-full"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={relation.isPublished}
                  onChange={(event) =>
                    void patchRelation(relation.id, { isPublished: event.target.checked })
                  }
                  disabled={savingId === relation.id}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Видно
              </label>

              <button
                type="button"
                onClick={() => void removeRelation(relation.id)}
                disabled={deletingId === relation.id}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === relation.id ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
