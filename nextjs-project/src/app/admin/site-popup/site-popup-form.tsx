'use client'

import { useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import Button from '@/components/ui/button'
import { RichTextEditor } from '@/app/admin/news/components/RichTextEditor'
import { CoverImageDropzone } from '@/app/admin/news/components/CoverImageDropzone'
import type { SitePopupFormInput } from './actions'

function extractPlainTextFromTiptap(content: JSONContent | null): string {
  if (!content?.content) return ''

  const out: string[] = []
  const stack: JSONContent[] = [...content.content]

  while (stack.length > 0) {
    const node = stack.shift()
    if (!node) continue
    if (typeof node.text === 'string') out.push(node.text)
    if (Array.isArray(node.content)) stack.unshift(...node.content)
  }

  return out.join(' ').replace(/\s+/g, ' ').trim()
}

interface SitePopupFormProps {
  initialValue: SitePopupFormInput & { richJson: JSONContent | null }
}

export function SitePopupForm({ initialValue }: SitePopupFormProps) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      const res = await fetch('/api/admin/site-popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Не удалось сохранить попап')
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить попап')
    } finally {
      setSaving(false)
    }
  }

  const plainTextPreview = extractPlainTextFromTiptap(value.richJson ?? null)
  return (
    <div className="space-y-6">
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

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={value.isEnabled}
                onChange={(e) =>
                  setValue((prev) => ({ ...prev, isEnabled: e.target.checked }))
                }
              />
              Включить попап на главной
            </label>
            <p className="text-xs text-gray-500 mt-1">
              При включении попап будет показываться только на главной странице.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название попапа (для админки)
          </label>
          <input
            className="form-input w-full"
            value={value.title}
            onChange={(e) => setValue((prev) => ({ ...prev, title: e.target.value }))}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Контент</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Картинка (опционально)
          </label>
          <CoverImageDropzone
            value={value.imageUrl ?? ''}
            onChange={(url) =>
              setValue((prev) => ({
                ...prev,
                imageUrl: url || null,
              }))
            }
            folder="popup"
            className="mb-2"
          />
          <p className="text-xs text-gray-500">
            Перетащите файл или нажмите для выбора. Рекомендуется использовать изображения
            в формате WebP с подходящими пропорциями для десктопа и мобайла.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Текст (rich)
          </label>
          <RichTextEditor
            value={(value.richJson as JSONContent | null) ?? { type: 'doc', content: [] }}
            onChange={(next) =>
              setValue((prev) => ({
                ...prev,
                richJson: next,
              }))
            }
            placeholder="Введите текст попапа: заголовок, описание, форматирование…"
            uploadedMedia={[]}
            onMediaUploaded={() => {}}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Текст кнопки</label>
            <input
              className="form-input w-full"
              value={value.ctaLabel ?? ''}
              onChange={(e) =>
                setValue((prev) => ({
                  ...prev,
                  ctaLabel: e.target.value || null,
                }))
              }
              placeholder="Например: Смотреть акции"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка кнопки</label>
            <input
              className="form-input w-full"
              value={value.ctaUrl ?? ''}
              onChange={(e) =>
                setValue((prev) => ({
                  ...prev,
                  ctaUrl: e.target.value || null,
                }))
              }
              placeholder="Например: /catalog/aktsii"
            />
            <p className="text-xs text-gray-500 mt-1">
              Можно указать относительный путь (например, /catalog/aktsii) или полный URL.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Поведение</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Показать через, секунд
            </label>
            <input
              type="number"
              min={0}
              className="form-input w-full"
              value={value.delaySeconds}
              onChange={(e) =>
                setValue((prev) => ({
                  ...prev,
                  delaySeconds: Number.parseInt(e.target.value || '0', 10),
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Не показывать повторно, дней
            </label>
            <input
              type="number"
              min={0}
              className="form-input w-full"
              value={value.hideForDays}
              onChange={(e) =>
                setValue((prev) => ({
                  ...prev,
                  hideForDays: Number.parseInt(e.target.value || '0', 10),
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Автозакрытие, секунд
            </label>
            <input
              type="number"
              min={0}
              className="form-input w-full"
              value={value.autoCloseSeconds ?? 0}
              onChange={(e) => {
                const raw = e.target.value
                const next = Number.parseInt(raw || '0', 10)
                setValue((prev) => ({
                  ...prev,
                  autoCloseSeconds: next > 0 ? next : null,
                }))
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              Оставьте 0, чтобы не закрывать попап автоматически.
            </p>
          </div>
        </div>
      </section>

      <div className="pt-4">
        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить попап'}
        </Button>
      </div>

      <section className="pt-6 border-t border-gray-200 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Предпросмотр попапа</h2>
        <p className="text-xs text-gray-500 mb-3">
          Макет того, как попап будет выглядеть на сайте. Точные отступы и адаптивное поведение можно проверить на
          главной странице после сохранения.
        </p>
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-md overflow-hidden border border-gray-100">
          {value.imageUrl && (
            <div className="relative h-36 w-full bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value.imageUrl} alt={value.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {value.title || 'Заголовок попапа'}
              </h3>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs">
                ×
              </span>
            </div>
            {plainTextPreview && (
              <p className="text-xs text-gray-700 line-clamp-3 whitespace-pre-line">
                {plainTextPreview}
              </p>
            )}
            {value.ctaLabel && (
              <div className="pt-1 flex justify-center">
                <span className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white">
                  {value.ctaLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

