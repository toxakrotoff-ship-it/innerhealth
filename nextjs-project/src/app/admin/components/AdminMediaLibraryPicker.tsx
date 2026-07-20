'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export interface AdminMediaLibraryItem {
  url: string
  objectKey: string
  name: string
  folder: string
  mimeType: string
  size: number | null
  lastModified: string | null
}

interface AdminMediaLibraryPickerProps {
  folders: string[]
  kind?: 'image' | 'document'
  buttonLabel?: string
  modalTitle?: string
  disabled?: boolean
  onSelect: (item: AdminMediaLibraryItem) => void
}

function formatBytes(size: number | null): string {
  if (!size || size <= 0) return 'Размер неизвестен'
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}

function formatDate(value: string | null): string {
  if (!value) return 'Дата неизвестна'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Дата неизвестна'
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function AdminMediaLibraryPicker({
  folders,
  kind = 'image',
  buttonLabel = 'Выбрать из библиотеки',
  modalTitle = 'Библиотека медиа',
  disabled,
  onSelect,
}: AdminMediaLibraryPickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<AdminMediaLibraryItem[]>([])

  const foldersKey = useMemo(() => folders.join(','), [folders])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        folders: foldersKey,
        kind,
        limit: '200',
      })
      if (query.trim()) params.set('q', query.trim())
      const response = await fetch(`/api/admin/media-library?${params.toString()}`, {
        credentials: 'include',
      })
      const data = (await response.json().catch(() => [])) as
        | AdminMediaLibraryItem[]
        | { error?: string }

      if (!response.ok) {
        throw new Error('error' in data && data.error ? data.error : 'Не удалось загрузить файлы')
      }
      setItems(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить файлы')
    } finally {
      setLoading(false)
    }
  }, [foldersKey, kind, query])

  useEffect(() => {
    if (!open) return
    const timeoutId = window.setTimeout(() => {
      void load()
    }, query ? 200 : 0)
    return () => window.clearTimeout(timeoutId)
  }, [open, load, query])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-130 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{modalTitle}</h3>
                <p className="text-xs text-gray-500">
                  Папки: {folders.join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Закрыть
              </button>
            </div>

            <div className="border-b border-gray-200 px-5 py-3">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={kind === 'document' ? 'Поиск по имени файла или пути' : 'Поиск по имени файла или пути'}
                className="form-input w-full"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
              {loading ? (
                <p className="text-sm text-gray-500">Загрузка библиотеки...</p>
              ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-gray-500">Подходящих файлов пока нет.</p>
              ) : kind === 'document' ? (
                <div className="space-y-2">
                  {items.map((item) => (
                    <button
                      key={item.objectKey}
                      type="button"
                      onClick={() => {
                        onSelect(item)
                        setOpen(false)
                      }}
                      className="flex w-full items-start justify-between gap-4 rounded-xl border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="truncate text-xs text-gray-500">{item.url}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatBytes(item.size)} • {formatDate(item.lastModified)}
                        </p>
                      </div>
                      <span className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white">
                        Выбрать
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <button
                      key={item.objectKey}
                      type="button"
                      onClick={() => {
                        onSelect(item)
                        setOpen(false)
                      }}
                      className="overflow-hidden rounded-xl border border-gray-200 text-left hover:border-blue-300 hover:shadow-sm"
                    >
                      <div className="aspect-square bg-gray-100">
                        <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="truncate text-xs text-gray-500">{item.folder}</p>
                        <p className="text-xs text-gray-500">{formatDate(item.lastModified)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
