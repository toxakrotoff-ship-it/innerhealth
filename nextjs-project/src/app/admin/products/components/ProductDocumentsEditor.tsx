'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProductDocumentType } from '@prisma/client'
import {
  AdminMediaLibraryPicker,
  type AdminMediaLibraryItem,
} from '@/app/admin/components/AdminMediaLibraryPicker'
import { formatDocumentFileSize, PRODUCT_DOCUMENT_TYPE_OPTIONS } from '@/lib/product-documents'

type AdminBrand = 'inner' | 'sprint-power'

interface LinkedProductRef {
  id: string
  title: string
  slug: string | null
  brand: string | null
}

interface AdminProductDocument {
  id: string
  title: string
  type: ProductDocumentType
  typeLabel: string
  fileUrl: string
  fileName: string | null
  originalName: string | null
  mimeType: string | null
  fileSize: number | null
  documentNumber: string | null
  issuedAt: string | null
  expiresAt: string | null
  sortOrder: number
  isPublished: boolean
  productSortOrder: number
  linkedProducts: LinkedProductRef[]
}

interface ProductDocumentSuggestion {
  id: string
  title: string
  type: ProductDocumentType
  typeLabel: string
  fileName: string | null
  documentNumber: string | null
  isPublished: boolean
}

interface UploadedProductDocumentFile {
  fileUrl: string
  fileName: string
  originalName: string
  mimeType: string
  fileSize: number
}

interface UploadedProductDocumentFileResponse {
  url: string
  fileName: string
  originalName: string
  mimeType?: string | null
  fileSize: number
}

interface ProductDocumentsEditorProps {
  productId?: string | null
  activeBrand: AdminBrand | null
}

interface EditableDocumentState extends AdminProductDocument {
  uploadMeta?: UploadedProductDocumentFile | null
}

const DEFAULT_CREATE_TYPE: ProductDocumentType = 'DECLARATION'

function inferMimeTypeFromFileName(fileName: string | null | undefined): string | null {
  const normalized = fileName?.trim().toLowerCase() ?? ''
  if (normalized.endsWith('.pdf')) return 'application/pdf'
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg'
  if (normalized.endsWith('.png')) return 'image/png'
  if (normalized.endsWith('.webp')) return 'image/webp'
  return null
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}

async function uploadProductDocumentFile(file: File): Promise<UploadedProductDocumentFile> {
  const formData = new FormData()
  formData.set('file', file)

  const response = await fetch('/api/admin/product-documents/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = (await response.json().catch(() => ({}))) as
    | UploadedProductDocumentFileResponse
    | { error?: string }

  if (!response.ok) {
    throw new Error('error' in data && data.error ? data.error : 'Не удалось загрузить файл')
  }

  const uploaded = data as UploadedProductDocumentFileResponse

  return {
    fileUrl: uploaded.url,
    fileName: uploaded.fileName,
    originalName: uploaded.originalName,
    fileSize: uploaded.fileSize,
    mimeType:
      uploaded.mimeType ??
      inferMimeTypeFromFileName(uploaded.originalName) ??
      inferMimeTypeFromFileName(uploaded.fileName) ??
      '',
  }
}

function emptyCreateState() {
  return {
    title: '',
    type: DEFAULT_CREATE_TYPE,
    documentNumber: '',
    issuedAt: '',
    expiresAt: '',
    sortOrder: '0',
    isPublished: true,
    uploadedFile: null as UploadedProductDocumentFile | null,
  }
}

function toUploadedDocumentFileFromLibraryItem(item: AdminMediaLibraryItem): UploadedProductDocumentFile {
  return {
    fileUrl: item.url,
    fileName: item.name,
    originalName: item.name,
    mimeType: item.mimeType,
    fileSize: item.size ?? 0,
  }
}

export function ProductDocumentsEditor({
  productId,
  activeBrand,
}: ProductDocumentsEditorProps) {
  const [documents, setDocuments] = useState<EditableDocumentState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createState, setCreateState] = useState(() => emptyCreateState())
  const [creating, setCreating] = useState(false)
  const [uploadingCreateFile, setUploadingCreateFile] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ProductDocumentSuggestion[]>([])

  const loadDocuments = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/admin/product-documents?productId=${encodeURIComponent(productId)}`,
        { credentials: 'include' }
      )
      const data = (await response.json().catch(() => [])) as
        | EditableDocumentState[]
        | { error?: string }

      if (!response.ok) {
        throw new Error('error' in data && data.error ? data.error : 'Не удалось загрузить документы')
      }

      setDocuments(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить документы')
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (!productId) return

    const normalizedQuery = searchQuery.trim()
    if (!normalizedQuery) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/product-documents/suggest?q=${encodeURIComponent(
            normalizedQuery
          )}&productId=${encodeURIComponent(productId)}&limit=8`,
          { credentials: 'include', signal: controller.signal }
        )
        const data = (await response.json().catch(() => [])) as ProductDocumentSuggestion[]
        if (!response.ok) throw new Error('Не удалось загрузить подсказки')
        setSuggestions(Array.isArray(data) ? data : [])
      } catch (suggestError) {
        if (controller.signal.aborted) return
        console.error('product document suggest', suggestError)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [productId, searchQuery])

  const orderedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) => {
        if (a.productSortOrder !== b.productSortOrder) return a.productSortOrder - b.productSortOrder
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
        return a.title.localeCompare(b.title, 'ru')
      }),
    [documents]
  )

  async function handleCreateUpload(file: File | null) {
    if (!file) return
    setUploadingCreateFile(true)
    setError(null)
    try {
      const uploadedFile = await uploadProductDocumentFile(file)
      setCreateState((prev) => ({
        ...prev,
        uploadedFile,
        title: prev.title || uploadedFile.originalName.replace(/\.[^.]+$/, ''),
      }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить файл')
    } finally {
      setUploadingCreateFile(false)
    }
  }

  async function createDocument() {
    if (!productId || !createState.uploadedFile) return
    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-documents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          title: createState.title,
          type: createState.type,
          documentNumber: createState.documentNumber || null,
          issuedAt: createState.issuedAt || null,
          expiresAt: createState.expiresAt || null,
          sortOrder: Number.parseInt(createState.sortOrder || '0', 10) || 0,
          isPublished: createState.isPublished,
          ...createState.uploadedFile,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as
        | EditableDocumentState
        | { error?: string }

      if (!response.ok) {
        throw new Error('error' in data && data.error ? data.error : 'Не удалось создать документ')
      }

      setDocuments((prev) => [...prev, data as EditableDocumentState])
      setCreateState(emptyCreateState())
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Не удалось создать документ')
    } finally {
      setCreating(false)
    }
  }

  async function saveDocument(document: EditableDocumentState) {
    setSavingId(document.id)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-documents', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: document.id,
          title: document.title,
          type: document.type,
          documentNumber: document.documentNumber || null,
          issuedAt: document.issuedAt ? toDateInputValue(document.issuedAt) : null,
          expiresAt: document.expiresAt ? toDateInputValue(document.expiresAt) : null,
          sortOrder: document.sortOrder,
          isPublished: document.isPublished,
          ...(document.uploadMeta ?? {}),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить документ')
      }

      setDocuments((prev) =>
        prev.map((item) => (item.id === document.id ? { ...document, uploadMeta: null } : item))
      )
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить документ')
    } finally {
      setSavingId(null)
    }
  }

  async function replaceDocumentFile(documentId: string, file: File | null) {
    if (!file) return
    setSavingId(documentId)
    setError(null)

    try {
      const uploadedFile = await uploadProductDocumentFile(file)
      setDocuments((prev) =>
        prev.map((document) =>
          document.id === documentId
            ? {
                ...document,
                fileUrl: uploadedFile.fileUrl,
                fileName: uploadedFile.fileName,
                originalName: uploadedFile.originalName,
                mimeType: uploadedFile.mimeType,
                fileSize: uploadedFile.fileSize,
                uploadMeta: uploadedFile,
              }
            : document
        )
      )
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось заменить файл')
    } finally {
      setSavingId(null)
    }
  }

  async function attachExistingDocument(documentId: string) {
    if (!productId) return
    setAttachingId(documentId)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-documents?action=attach', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, documentId, sortOrder: 0 }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось привязать документ')
      }

      setSearchQuery('')
      setSuggestions([])
      await loadDocuments()
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : 'Не удалось привязать документ')
    } finally {
      setAttachingId(null)
    }
  }

  async function detachDocument(documentId: string) {
    if (!productId) return
    setDeletingId(documentId)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-documents?action=detach', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, documentId }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отвязать документ')
      }

      setDocuments((prev) => prev.filter((document) => document.id !== documentId))
    } catch (detachError) {
      setError(detachError instanceof Error ? detachError.message : 'Не удалось отвязать документ')
    } finally {
      setDeletingId(null)
    }
  }

  async function deleteDocument(documentId: string) {
    setDeletingId(documentId)
    setError(null)

    try {
      const response = await fetch('/api/admin/product-documents', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: documentId }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось удалить документ')
      }

      setDocuments((prev) => prev.filter((document) => document.id !== documentId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Не удалось удалить документ')
    } finally {
      setDeletingId(null)
    }
  }

  async function moveDocument(documentId: string, direction: -1 | 1) {
    if (!productId) return
    const currentIndex = orderedDocuments.findIndex((document) => document.id === documentId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedDocuments.length) return

    const nextDocuments = [...orderedDocuments]
    const [item] = nextDocuments.splice(currentIndex, 1)
    nextDocuments.splice(targetIndex, 0, item)
    const normalized = nextDocuments.map((document, index) => ({
      ...document,
      productSortOrder: index,
    }))
    setDocuments(normalized)

    try {
      const response = await fetch('/api/admin/product-documents', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          items: normalized.map((document) => ({
            documentId: document.id,
            sortOrder: document.productSortOrder,
          })),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить порядок')
      }
    } catch (reorderError) {
      setError(reorderError instanceof Error ? reorderError.message : 'Не удалось сохранить порядок')
      await loadDocuments()
    }
  }

  if (!productId) {
    return (
      <section className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
        <h2 className="text-base font-semibold text-gray-900">Документы товара</h2>
        <p className="text-sm text-gray-600">
          Документы можно привязывать после первого сохранения товара.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Документы товара</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Бренд: {activeBrand === 'sprint-power' ? 'Sprint Power' : 'Inner Health'}. Один документ
          можно привязать к нескольким товарам без дублирования файла.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Создать новый документ</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Файл
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              <AdminMediaLibraryPicker
                folders={['documents']}
                kind="document"
                onSelect={(item) =>
                  setCreateState((prev) => {
                    const uploadedFile = toUploadedDocumentFileFromLibraryItem(item)
                    return {
                      ...prev,
                      uploadedFile,
                      title: prev.title || item.name.replace(/\.[^.]+$/, ''),
                    }
                  })
                }
                disabled={uploadingCreateFile}
              />
            </div>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => void handleCreateUpload(event.target.files?.[0] ?? null)}
              className="form-input w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              Допустимы PDF, JPG, PNG, WebP. До 20 МБ.
            </p>
            {createState.uploadedFile && (
              <p className="mt-1 text-xs text-emerald-700">
                Загружено: {createState.uploadedFile.originalName}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Тип
            </label>
            <select
              value={createState.type}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  type: event.target.value as ProductDocumentType,
                }))
              }
              className="form-input w-full"
            >
              {PRODUCT_DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Название
            </label>
            <input
              type="text"
              value={createState.title}
              onChange={(event) =>
                setCreateState((prev) => ({ ...prev, title: event.target.value }))
              }
              className="form-input w-full"
              placeholder="Например, Декларация соответствия коллагена"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Номер
              </label>
              <input
                type="text"
                value={createState.documentNumber}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, documentNumber: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Порядок
              </label>
              <input
                type="number"
                value={createState.sortOrder}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, sortOrder: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Дата документа
              </label>
              <input
                type="date"
                value={createState.issuedAt}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, issuedAt: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Срок действия
              </label>
              <input
                type="date"
                value={createState.expiresAt}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
                className="form-input w-full"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={createState.isPublished}
              onChange={(event) =>
                setCreateState((prev) => ({ ...prev, isPublished: event.target.checked }))
              }
            />
            Опубликован
          </label>

          <button
            type="button"
            onClick={() => void createDocument()}
            disabled={creating || uploadingCreateFile || !createState.uploadedFile}
            className="inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
          >
            {creating ? 'Создаём...' : 'Создать и привязать'}
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Привязать существующий</h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="form-input w-full"
            placeholder="Поиск по названию, номеру или имени файла"
          />
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {suggestions.length === 0 && searchQuery.trim() ? (
              <p className="text-sm text-gray-500">Ничего не найдено.</p>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {suggestion.title}
                      </p>
                      <p className="text-gray-500">
                        {suggestion.typeLabel}
                        {suggestion.documentNumber ? ` • № ${suggestion.documentNumber}` : ''}
                      </p>
                      {suggestion.fileName && (
                        <p className="truncate text-xs text-gray-500">{suggestion.fileName}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void attachExistingDocument(suggestion.id)}
                      disabled={attachingId === suggestion.id}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-60 dark:border-gray-600 dark:text-gray-100"
                    >
                      {attachingId === suggestion.id ? '...' : 'Привязать'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Привязанные документы
          </h3>
          {loading && <span className="text-xs text-gray-500">Загрузка...</span>}
        </div>

        {orderedDocuments.length === 0 && !loading ? (
          <p className="text-sm text-gray-500">Пока нет привязанных документов.</p>
        ) : (
          <div className="space-y-3">
            {orderedDocuments.map((document, index) => (
              <div
                key={document.id}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Название
                      </label>
                      <input
                        type="text"
                        value={document.title}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id ? { ...item, title: event.target.value } : item
                            )
                          )
                        }
                        className="form-input w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Тип
                      </label>
                      <select
                        value={document.type}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? { ...item, type: event.target.value as ProductDocumentType }
                                : item
                            )
                          )
                        }
                        className="form-input w-full"
                      >
                        {PRODUCT_DOCUMENT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Номер
                      </label>
                      <input
                        type="text"
                        value={document.documentNumber ?? ''}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? { ...item, documentNumber: event.target.value }
                                : item
                            )
                          )
                        }
                        className="form-input w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Дата документа
                      </label>
                      <input
                        type="date"
                        value={toDateInputValue(document.issuedAt)}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? { ...item, issuedAt: event.target.value || null }
                                : item
                            )
                          )
                        }
                        className="form-input w-full"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Срок действия
                      </label>
                      <input
                        type="date"
                        value={toDateInputValue(document.expiresAt)}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? { ...item, expiresAt: event.target.value || null }
                                : item
                            )
                          )
                        }
                        className="form-input w-full"
                      />
                      {isExpired(document.expiresAt) && (
                        <p className="mt-1 text-xs text-amber-700">Срок действия истёк</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Порядок в товаре
                      </label>
                      <input
                        type="number"
                        value={document.productSortOrder}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? {
                                    ...item,
                                    productSortOrder:
                                      Number.parseInt(event.target.value || '0', 10) || 0,
                                  }
                                : item
                            )
                          )
                        }
                        className="form-input w-full"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Глобальный порядок
                      </label>
                      <input
                        type="number"
                        value={document.sortOrder}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? { ...item, sortOrder: Number.parseInt(event.target.value || '0', 10) || 0 }
                                : item
                            )
                          )
                        }
                        className="form-input w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Файл
                      </p>
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-sm font-medium text-blue-700 hover:underline"
                      >
                        {document.originalName || document.fileName || 'Открыть файл'}
                      </a>
                      <p className="mt-1 text-xs text-gray-500">
                        {[document.mimeType, formatDocumentFileSize(document.fileSize)]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Заменить файл
                      </label>
                      <div className="mb-2">
                        <AdminMediaLibraryPicker
                          folders={['documents']}
                          kind="document"
                          onSelect={(item) =>
                            setDocuments((prev) =>
                              prev.map((doc) =>
                                doc.id === document.id
                                  ? {
                                      ...doc,
                                      fileUrl: item.url,
                                      fileName: item.name,
                                      originalName: item.name,
                                      mimeType: item.mimeType,
                                      fileSize: item.size,
                                      uploadMeta: toUploadedDocumentFileFromLibraryItem(item),
                                    }
                                  : doc
                              )
                            )
                          }
                          disabled={savingId === document.id}
                        />
                      </div>
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(event) =>
                          void replaceDocumentFile(document.id, event.target.files?.[0] ?? null)
                        }
                        className="form-input w-full"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={document.isPublished}
                        onChange={(event) =>
                          setDocuments((prev) =>
                            prev.map((item) =>
                              item.id === document.id
                                ? { ...item, isPublished: event.target.checked }
                                : item
                            )
                          )
                        }
                      />
                      Опубликован
                    </label>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Связанные товары
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {document.linkedProducts.map((product) => product.title).join(', ') || 'Нет'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void moveDocument(document.id, -1)}
                    disabled={index === 0}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-40 dark:border-gray-600 dark:text-gray-100"
                    aria-label="Поднять документ выше"
                  >
                    Вверх
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveDocument(document.id, 1)}
                    disabled={index === orderedDocuments.length - 1}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-40 dark:border-gray-600 dark:text-gray-100"
                    aria-label="Опустить документ ниже"
                  >
                    Вниз
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveDocument(document)}
                    disabled={savingId === document.id}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
                  >
                    {savingId === document.id ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void detachDocument(document.id)}
                    disabled={deletingId === document.id}
                    className="rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-60"
                    aria-label="Отвязать документ от товара"
                  >
                    Отвязать
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteDocument(document.id)}
                    disabled={deletingId === document.id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-60"
                    aria-label="Удалить документ полностью"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
