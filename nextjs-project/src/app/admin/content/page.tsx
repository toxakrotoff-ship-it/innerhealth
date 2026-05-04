'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import Button from '@/components/ui/button'
import { RichTextEditor } from '../news/components/RichTextEditor'
import { CoverImageDropzone } from '../news/components/CoverImageDropzone'

type BlockType = 'short' | 'rich'
type ValueSource = 'override' | 'brand_default' | 'generic_default'

interface ContentBlockAdmin {
  id?: string
  page: string
  key: string
  label: string
  type: BlockType
  text: string
  richJson: JSONContent | null
  rawText: string
  rawRichJson: JSONContent | null
  defaultText: string
  defaultRichJson: JSONContent | null
  valueSource: ValueSource
  isInherited: boolean
  isDirty: boolean
  colorToken: string
  fontVariant: string
  fontWeight: string
}

const PAGES: Array<{ id: string; label: string }> = [
  { id: 'home', label: 'Главная' },
  { id: 'about', label: 'О нас' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'cart', label: 'Корзина' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contacts', label: 'Контакты' },
  { id: 'certificates', label: 'Сертификаты соответствия' },
  { id: 'sotrudnichestvo', label: 'Сотрудничество' },
  { id: 'footer', label: 'Футер' },
  { id: 'legal-privacy', label: 'Политика конфиденциальности' },
  { id: 'legal-oferta', label: 'Публичная оферта' },
]

const COLOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'По умолчанию' },
  { value: 'text-white', label: 'Белый' },
  { value: 'text-blue-300', label: 'Голубой (акцент)' },
  { value: 'text-blue-400', label: 'Синий светлый' },
  { value: 'text-slate-300', label: 'Серый светлый' },
  { value: 'text-slate-400', label: 'Серый' },
  { value: 'text-slate-500', label: 'Серый средний' },
  { value: 'text-slate-600', label: 'Серый тёмный' },
  { value: 'text-action-blue', label: 'Акцентный синий' },
]

const FONT_VARIANT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'По умолчанию (как в макете)' },
  { value: 'sans', label: 'Основной текст (Montserrat, font-sans)' },
  { value: 'display', label: 'Акцентный заголовок (Unbounded, font-display)' },
  { value: 'script', label: 'Декоративный (font-script)' },
]

const FONT_WEIGHT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'По умолчанию' },
  { value: 'thin', label: 'Тонкий (100)' },
  { value: 'light', label: 'Лёгкий (300)' },
  { value: 'normal', label: 'Обычный (400)' },
  { value: 'medium', label: 'Средний (500)' },
  { value: 'semibold', label: 'Полужирный (600)' },
  { value: 'bold', label: 'Жирный (700)' },
  { value: 'extrabold', label: 'Очень жирный (800)' },
]

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown }
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error
    }
  } catch {
    // Ignore parse errors and fall back to HTTP status below.
  }

  return `${fallback} (${response.status})`
}

function mapApiBlock(
  block: Record<string, unknown>,
  currentPage: string
): ContentBlockAdmin {
  return {
    id: 'id' in block ? (block.id as string | undefined) : undefined,
    page: (block.page as string) ?? currentPage,
    key: block.key as string,
    label: block.label as string,
    type: block.type as BlockType,
    text: (block.effectiveText as string | null) ?? (block.text as string | null) ?? '',
    richJson:
      ((block.effectiveRichJson as JSONContent | null) ??
        (block.richJson as JSONContent | null) ??
        null),
    rawText: (block.rawText as string | null) ?? '',
    rawRichJson: (block.rawRichJson as JSONContent | null) ?? null,
    defaultText: (block.defaultText as string | null) ?? '',
    defaultRichJson: (block.defaultRichJson as JSONContent | null) ?? null,
    valueSource: (block.valueSource as ValueSource | undefined) ?? 'generic_default',
    isInherited: Boolean(block.isInherited),
    isDirty: false,
    colorToken: (block.colorToken as string | null) ?? '',
    fontVariant: (block.fontVariant as string | null) ?? '',
    fontWeight: (block.fontWeight as string | null) ?? '',
  }
}

function getSourceLabel(source: ValueSource): string {
  switch (source) {
    case 'override':
      return 'Переопределено'
    case 'brand_default':
      return 'Наследуется из default бренда'
    case 'generic_default':
    default:
      return 'Наследуется из общего default'
  }
}

export default function AdminContentPage() {
  const [page, setPage] = useState<string>('home')
  const [blocks, setBlocks] = useState<ContentBlockAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.key === selectedKey) ?? blocks[0],
    [blocks, selectedKey]
  )

  useEffect(() => {
    void loadBlocks(page)
  }, [page])

  async function loadBlocks(currentPage: string) {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const res = await fetch(`/api/admin/content-blocks?page=${encodeURIComponent(currentPage)}`)
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Не удалось загрузить блоки'))
      }
      const data = (await res.json()) as Array<Record<string, unknown>>

      const mapped: ContentBlockAdmin[] = data.map((b) => mapApiBlock(b, currentPage))

      setBlocks(mapped)
      setSelectedKey(mapped[0]?.key ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
      setBlocks([])
      setSelectedKey(null)
    } finally {
      setLoading(false)
    }
  }

  function updateBlock(key: string, patch: Partial<ContentBlockAdmin>) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.key === key
          ? {
              ...b,
              ...patch,
              isDirty: true,
              isInherited: false,
              valueSource: 'override',
            }
          : b
      )
    )
  }

  function autoResizeTextarea(target: HTMLTextAreaElement): void {
    target.style.height = 'auto'
    target.style.height = `${target.scrollHeight}px`
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const dirtyBlocks = blocks.filter((block) => block.isDirty)
      if (dirtyBlocks.length === 0) {
        setSuccess(true)
        return
      }

      const payload = {
        page,
        blocks: dirtyBlocks.map((b) => ({
          id: b.id,
          page: b.page,
          key: b.key,
          label: b.label,
          type: b.type,
          text: b.type === 'short' ? b.text : null,
          richJson: b.type === 'rich' ? b.richJson ?? EMPTY_DOC : null,
          colorToken: b.colorToken || null,
          fontVariant: b.fontVariant || null,
          fontWeight: b.fontWeight || null,
        })),
      }

      const res = await fetch('/api/admin/content-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' && data.error.trim().length > 0
            ? data.error
            : `Не удалось сохранить (${res.status})`
        )
      }

      setSuccess(true)
      setBlocks((data as Array<Record<string, unknown>>).map((b) => mapApiBlock(b, page)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetSelectedBlock() {
    if (!selectedBlock) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const res = await fetch('/api/admin/content-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          blocks: [
            {
              page: selectedBlock.page,
              key: selectedBlock.key,
              label: selectedBlock.label,
              type: selectedBlock.type,
              reset: true,
            },
          ],
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' && data.error.trim().length > 0
            ? data.error
            : `Не удалось сбросить override (${res.status})`
        )
      }

      setSuccess(true)
      setBlocks((data as Array<Record<string, unknown>>).map((b) => mapApiBlock(b, page)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Тексты страниц</h1>
            <p className="text-gray-500 text-sm">
              Выберите страницу, затем блок для редактирования текста, цветов и шрифта.
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <select
              className="form-input w-full sm:w-auto sm:min-w-[180px]"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            >
              {PAGES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            Изменения сохранены.
          </div>
        )}

        {loading ? (
          <p className="text-gray-500">Загрузка блоков...</p>
        ) : blocks.length === 0 ? (
          <p className="text-gray-500">Для этой страницы пока нет блоков.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] gap-6 items-start">
            <aside className="space-y-2">
              {blocks.map((b) => {
                const isActive = selectedBlock?.key === b.key
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setSelectedKey(b.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium">{b.label}</div>
                    <div className="text-xs text-gray-500">{b.key}</div>
                  </button>
                )
              })}
            </aside>

            {selectedBlock && (
              <section className="space-y-6 self-start md:sticky md:top-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedBlock.label}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs rounded-full border border-gray-200 px-2 py-0.5 text-gray-500">
                        {selectedBlock.type === 'short' ? 'Короткий текст' : 'Rich text'}
                      </span>
                      <span
                        className={`text-xs rounded-full border px-2 py-0.5 ${
                          selectedBlock.isInherited
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {getSourceLabel(selectedBlock.valueSource)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Ключ: <code className="text-[11px]">{selectedBlock.key}</code>
                  </p>
                  {selectedBlock.isInherited && (
                    <p className="mt-2 text-xs text-amber-700">
                      Редактор показывает фактическое значение с витрины. Override для этого блока в бренде сейчас не сохранён.
                    </p>
                  )}
                </div>

                {selectedBlock.type === 'short' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {selectedBlock.key.endsWith('.image1.src') ||
                      selectedBlock.key.endsWith('.image2.src') ||
                      selectedBlock.key.includes('.gallery.image') && selectedBlock.key.endsWith('.src')
                        ? 'URL изображения'
                        : 'Текст'}
                    </label>
                    {selectedBlock.key === 'hero.title' && (
                      <p className="text-xs text-gray-500 mb-1">
                        Каждая строка — отдельная строка на экране. Новый абзац — Enter.
                      </p>
                    )}
                    {selectedBlock.key === 'hero.title.highlight' && (
                      <p className="text-xs text-gray-500 mb-1">
                        Впишите слово из заголовка выше — именно оно будет выделено цветом на сайте. Цвет задаётся ниже.
                      </p>
                    )}
                    {((selectedBlock.key === 'about.image1.src' ||
                      selectedBlock.key === 'about.image2.src') ||
                      (selectedBlock.key.includes('.gallery.image') && selectedBlock.key.endsWith('.src'))) && (
                      <>
                        <CoverImageDropzone
                          value={selectedBlock.text}
                          onChange={(url) =>
                            updateBlock(selectedBlock.key, { text: url })
                          }
                          folder="content"
                          className="mb-3"
                        />
                        <p className="text-xs text-gray-500 mb-1">
                          Или введите URL вручную:
                        </p>
                      </>
                    )}
                    {selectedBlock.key === 'categories.fontVariant' ? (
                      <>
                        <p className="text-xs text-gray-500 mb-1">
                          Применяется к названиям категорий на главной и в каталоге (карточки «Коллаген», «Грибная коллекция» и т.д.).
                        </p>
                        <select
                          className="form-input w-full"
                          value={
                            ['sans', 'display', 'script'].includes(
                              selectedBlock.text?.trim() ?? ''
                            )
                              ? selectedBlock.text.trim()
                              : 'display'
                          }
                          onChange={(e) =>
                            updateBlock(selectedBlock.key, {
                              text: e.target.value,
                            })
                          }
                        >
                          <option value="sans">Основной текст (Montserrat)</option>
                          <option value="display">Акцентный (Unbounded)</option>
                          <option value="script">Декоративный</option>
                        </select>
                        <p
                          className={`mt-2 text-lg font-medium border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 ${
                            selectedBlock.text?.trim()?.toLowerCase() === 'sans'
                              ? 'font-sans'
                              : selectedBlock.text?.trim()?.toLowerCase() === 'script'
                                ? 'font-script'
                                : 'font-display'
                          }`}
                        >
                          Коллаген · Грибная коллекция
                        </p>
                      </>
                    ) : (
                      <textarea
                        className="form-input w-full"
                        rows={1}
                        style={{ minHeight: selectedBlock.key === 'hero.title' ? '120px' : '44px' }}
                        onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        ref={(node) => {
                          if (node) autoResizeTextarea(node)
                        }}
                        value={selectedBlock.text}
                        onChange={(e) =>
                          updateBlock(selectedBlock.key, {
                            text: e.target.value,
                          })
                        }
                        placeholder={
                          selectedBlock.key === 'hero.title.highlight'
                            ? 'Например: твоего'
                            : selectedBlock.key.startsWith('about.image')
                              ? 'Например: /images/o-nas/face-lift.jpg'
                              : undefined
                        }
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Текст (rich)
                    </label>
                    <RichTextEditor
                      value={selectedBlock.richJson ?? EMPTY_DOC}
                      onChange={(value) =>
                        updateBlock(selectedBlock.key, { richJson: value })
                      }
                      placeholder="Введите текст..."
                      uploadedMedia={[]}
                      onMediaUploaded={() => {}}
                    />
                  </div>
                )}

                {selectedBlock.key !== 'categories.fontVariant' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedBlock.key === 'hero.title.highlight'
                          ? 'Цвет выделенного слова'
                          : 'Цвет текста'}
                      </label>
                      <select
                        className="form-input w-full"
                        value={selectedBlock.colorToken}
                        onChange={(e) =>
                          updateBlock(selectedBlock.key, {
                            colorToken: e.target.value,
                          })
                        }
                      >
                        {COLOR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Жирность шрифта
                      </label>
                      <select
                        className="form-input w-full"
                        value={selectedBlock.fontWeight}
                        onChange={(e) =>
                          updateBlock(selectedBlock.key, {
                            fontWeight: e.target.value,
                          })
                        }
                      >
                        {FONT_WEIGHT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Семейство шрифта
                      </label>
                      <select
                        className="form-input w-full"
                        value={selectedBlock.fontVariant}
                        onChange={(e) =>
                          updateBlock(selectedBlock.key, {
                            fontVariant: e.target.value,
                          })
                        }
                      >
                        {FONT_VARIANT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p
                        className={`mt-2 text-lg text-gray-800 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 ${
                          selectedBlock.fontVariant === 'display'
                            ? 'font-display'
                            : selectedBlock.fontVariant === 'script'
                              ? 'font-script'
                              : selectedBlock.fontVariant === 'sans'
                                ? 'font-sans'
                                : ''
                        }`}
                        style={
                          selectedBlock.fontVariant === ''
                            ? { fontFamily: 'inherit' }
                            : undefined
                        }
                      >
                        {selectedBlock.fontVariant === 'script'
                          ? 'Красота изнутри'
                          : 'Аа Яя 012 — Заголовок'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={handleSave} disabled={saving}>
                      {saving ? 'Сохранение…' : 'Сохранить как override'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetSelectedBlock}
                      disabled={saving || (selectedBlock.isInherited && !selectedBlock.isDirty)}
                    >
                      Сбросить override
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
