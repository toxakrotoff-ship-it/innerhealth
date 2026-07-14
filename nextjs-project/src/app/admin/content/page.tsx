'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { NavArrowDown } from 'iconoir-react'
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

interface CategoryOption {
  id: string
  title: string
  slug: string
  href: string
}

interface BlockGroup {
  id: string
  title: string
  hint: string
  blocks: ContentBlockAdmin[]
}

interface BlockPresentationMeta {
  shortTitle: string
  helper: string
}

interface BlockTypeBadgeMeta {
  code: string
  label: string
  className: string
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
  { id: 'b2b', label: 'B2B' },
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

function parseBooleanText(value: string | null | undefined, fallback = false): boolean {
  if (value == null) return fallback
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === 'on' || normalized === 'да'
}

function isImageSrcKey(key: string): boolean {
  return key.endsWith('.image.src') ||
    key.endsWith('.image1.src') ||
    key.endsWith('.image2.src') ||
    (key.includes('.gallery.image') && key.endsWith('.src'))
}

function isBooleanKey(key: string): boolean {
  return key.endsWith('.isVisible')
}

function isSortOrderKey(key: string): boolean {
  return key.endsWith('.sortOrder')
}

function isCategorySlugKey(key: string): boolean {
  return key.endsWith('.categorySlug')
}

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

function getBlockGroupMeta(key: string): { id: string; title: string; hint: string } {
  if (key.startsWith('hero.')) {
    return { id: 'hero', title: 'Hero', hint: 'Первый экран, CTA и медиа' }
  }
  if (key.startsWith('home.directions.')) {
    return { id: 'directions', title: 'Направления', hint: 'Три карточки товарных направлений' }
  }
  if (key.startsWith('home.new.')) {
    return { id: 'new', title: 'Новинки', hint: 'Подписи и тексты секции новинок' }
  }
  if (key.startsWith('home.news.')) {
    return { id: 'news', title: 'Новости', hint: 'Показ и подписи новостной секции' }
  }
  if (key.startsWith('home.articles.')) {
    return { id: 'articles', title: 'Статьи', hint: 'Показ и подписи секции статей' }
  }
  if (key.startsWith('home.reviews.')) {
    return { id: 'reviews', title: 'Отзывы', hint: 'Отзывы и призыв оставить отзыв' }
  }
  if (key.startsWith('home.sections.')) {
    return { id: 'sections', title: 'Порядок секций', hint: 'Последовательность блоков на странице' }
  }
  if (key.startsWith('howToOrder.')) {
    return { id: 'how-to-order', title: 'Как заказать', hint: 'FAQ / сценарий заказа' }
  }
  if (key.startsWith('seo.')) {
    return { id: 'seo', title: 'SEO', hint: 'Заголовки, описание и OG' }
  }
  if (key.includes('.image')) {
    return { id: 'images', title: 'Изображения', hint: 'Медиа и alt-тексты' }
  }
  if (key.includes('.cta') || key.endsWith('.href')) {
    return { id: 'cta', title: 'Кнопки и ссылки', hint: 'Навигационные действия' }
  }
  if (key.startsWith('faq.')) {
    return { id: 'faq', title: 'FAQ', hint: 'Тексты страницы вопросов' }
  }
  if (key.startsWith('contacts.')) {
    return { id: 'contacts', title: 'Контакты', hint: 'Контактные данные и расписание' }
  }
  if (key.startsWith('footer.')) {
    return { id: 'footer', title: 'Футер', hint: 'Юридические и банковские данные' }
  }
  return { id: 'other', title: 'Прочее', hint: 'Остальные блоки страницы' }
}

function getBlockFieldLabel(key: string): string {
  if (isImageSrcKey(key)) return 'URL изображения'
  if (isBooleanKey(key)) return 'Видимость'
  if (isSortOrderKey(key)) return 'Порядок'
  if (isCategorySlugKey(key)) return 'Категория'
  return 'Текст'
}

function getBlockPlaceholder(key: string): string | undefined {
  if (key === 'hero.title.highlight') return 'Например: твоего'
  if (isImageSrcKey(key)) return 'Например: /images/o-nas/face-lift.jpg'
  if (key.endsWith('.href')) return 'Например: /catalog или /catalog/bulony'
  return undefined
}

function getBlockTypeBadgeMeta(block: ContentBlockAdmin): BlockTypeBadgeMeta {
  if (isBooleanKey(block.key)) {
    return {
      code: 'ON',
      label: 'Переключатель',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (block.key.endsWith('.href')) {
    return {
      code: 'URL',
      label: 'Ссылка',
      className: 'bg-sky-50 text-sky-700 border-sky-200',
    }
  }
  if (block.key.endsWith('.src')) {
    return {
      code: 'IMG',
      label: 'Изображение',
      className: 'bg-violet-50 text-violet-700 border-violet-200',
    }
  }
  if (block.key.endsWith('.alt')) {
    return {
      code: 'ALT',
      label: 'Описание изображения',
      className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    }
  }
  if (block.key.endsWith('.categorySlug')) {
    return {
      code: 'CAT',
      label: 'Категория',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }
  if (block.key.endsWith('.sortOrder')) {
    return {
      code: 'ORD',
      label: 'Порядок',
      className: 'bg-orange-50 text-orange-700 border-orange-200',
    }
  }
  if (block.type === 'rich') {
    return {
      code: 'RT',
      label: 'Rich text',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    }
  }
  return {
    code: 'TXT',
    label: 'Текст',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  }
}

function getBlockPreviewValue(block: ContentBlockAdmin): string {
  if (isBooleanKey(block.key)) {
    return parseBooleanText(block.text, false) ? 'Показывается на витрине' : 'Скрыто на витрине'
  }

  const sourceValue =
    block.type === 'rich'
      ? ''
      : block.text?.trim() || block.defaultText?.trim() || ''

  if (sourceValue.length === 0) {
    return 'Значение пока не заполнено'
  }

  if (block.key.endsWith('.href')) {
    return `Переход: ${sourceValue}`
  }
  if (block.key.endsWith('.src')) {
    return 'Изображение задано'
  }
  if (block.key.endsWith('.alt')) {
    return sourceValue
  }
  if (block.key.endsWith('.categorySlug')) {
    return `Категория: ${sourceValue}`
  }
  if (block.key.endsWith('.sortOrder')) {
    return `Порядок: ${sourceValue}`
  }

  return sourceValue
}

function stripTechnicalSuffix(label: string): string {
  return label
    .replace(/\s*\(1\s*\/\s*да\s*\/\s*on\)\s*$/i, '')
    .replace(/\s*—\s*показывать\s*$/i, '')
    .trim()
}

function toSentenceCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getReadableEntityName(key: string): string {
  if (key.includes('badge')) return 'бейдж'
  if (key.includes('title.highlight')) return 'выделенное слово'
  if (key.includes('title')) return 'заголовок'
  if (key.includes('subtitle')) return 'подзаголовок'
  if (key.includes('description')) return 'описание'
  if (key.includes('cta.label')) return 'текст кнопки'
  if (key.includes('cta.href')) return 'ссылку кнопки'
  if (key.includes('image.alt')) return 'alt-текст изображения'
  if (key.includes('image.src')) return 'изображение'
  if (key.includes('categorySlug')) return 'категорию'
  if (key.includes('sortOrder')) return 'порядок'
  if (key.includes('isVisible')) return 'видимость'
  return 'поле'
}

function getBlockPresentationMeta(block: ContentBlockAdmin): BlockPresentationMeta {
  const groupTitle = getBlockGroupMeta(block.key).title
  const cleanedLabel = stripTechnicalSuffix(block.label)
  const withoutGroupPrefix = cleanedLabel.replace(new RegExp(`^${groupTitle}\\s*[—-]\\s*`, 'i'), '').trim()
  const shortTitle = withoutGroupPrefix || cleanedLabel || block.key

  if (block.key.includes('isVisible')) {
    return {
      shortTitle: toSentenceCase(shortTitle.replace(/^показывать\s+/i, '')),
      helper: 'Переключатель: показывать или скрыть элемент на витрине',
    }
  }

  if (block.key.endsWith('.href')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Ссылка: куда попадёт пользователь после клика',
    }
  }

  if (block.key.endsWith('.alt')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Описание изображения для доступности и SEO',
    }
  }

  if (block.key.endsWith('.src')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Источник изображения: загрузите файл или укажите URL',
    }
  }

  if (block.key.endsWith('.categorySlug')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Выбор категории, с которой будет связан этот блок',
    }
  }

  if (block.key.endsWith('.sortOrder')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Число: чем меньше значение, тем выше элемент в списке',
    }
  }

  if (block.type === 'rich') {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Расширенный текстовый блок с форматированием',
    }
  }

  if (block.key.startsWith('hero.')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: `Поле Hero: меняет ${getReadableEntityName(block.key)} на первом экране`,
    }
  }

  if (block.key.startsWith('home.directions.')) {
    return {
      shortTitle: toSentenceCase(shortTitle),
      helper: 'Поле карточки направления на главной странице',
    }
  }

  return {
    shortTitle: toSentenceCase(shortTitle),
    helper: `Поле контента: меняет ${getReadableEntityName(block.key)} на странице`,
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
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.key === selectedKey) ?? blocks[0],
    [blocks, selectedKey]
  )

  const dirtyCount = useMemo(
    () => blocks.filter((block) => block.isDirty).length,
    [blocks]
  )

  const selectedGroupId = useMemo(
    () => (selectedBlock ? getBlockGroupMeta(selectedBlock.key).id : null),
    [selectedBlock]
  )

  const groupedBlocks = useMemo((): BlockGroup[] => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const filtered = normalizedQuery
      ? blocks.filter((block) =>
          `${block.label} ${block.key}`.toLowerCase().includes(normalizedQuery)
        )
      : blocks

    const groups = new Map<string, BlockGroup>()
    for (const block of filtered) {
      const meta = getBlockGroupMeta(block.key)
      const existing = groups.get(meta.id)
      if (existing) {
        existing.blocks.push(block)
        continue
      }
      groups.set(meta.id, {
        ...meta,
        blocks: [block],
      })
    }

    return Array.from(groups.values())
  }, [blocks, searchQuery])

  const selectedPresentation = useMemo(
    () => (selectedBlock ? getBlockPresentationMeta(selectedBlock) : null),
    [selectedBlock]
  )

  useEffect(() => {
    void loadBlocks(page)
  }, [page])

  useEffect(() => {
    if (page !== 'home') {
      setCategoryOptions([])
      return
    }

    void loadCategoryOptions()
  }, [page])

  useEffect(() => {
    if (selectedGroupId) {
      setExpandedGroupId(selectedGroupId)
    }
  }, [selectedGroupId])

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
      setSearchQuery('')
      setExpandedGroupId(mapped[0] ? getBlockGroupMeta(mapped[0].key).id : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
      setBlocks([])
      setSelectedKey(null)
    } finally {
      setLoading(false)
    }
  }

  async function loadCategoryOptions() {
    try {
      const res = await fetch('/api/admin/content-link-suggest?q=&limit=50')
      if (!res.ok) return
      const data = (await res.json()) as { categories?: CategoryOption[] }
      setCategoryOptions(Array.isArray(data.categories) ? data.categories : [])
    } catch {
      setCategoryOptions([])
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
    <div className="admin-container bg-slate-50">
      <div className="admin-content">
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/70 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.09),transparent_46%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.18),transparent_34%)]"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
                Контент-редактор
              </div>
              <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-900">
                Управление текстами и блоками
              </h1>
              <p className="max-w-3xl text-sm text-slate-600">
                Экран собран как рабочее место редактора: слева навигация по группам блоков, справа текущее значение, наследование и оформление. Необязательно знать ключи CMS, чтобы понять, что меняется.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Страница</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{PAGES.find((p) => p.id === page)?.label}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Блоков</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{blocks.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Изменено</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{dirtyCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Статус</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{saving ? 'Сохраняем…' : 'Готово к редактированию'}</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <select
              className="form-input w-full rounded-2xl border-slate-200 bg-white"
              value={page}
              onChange={(e) => setPage(e.target.value)}
            >
              {PAGES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              className="form-input w-full rounded-2xl border-slate-200 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Найти блок по названию или ключу"
            />
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)] items-start">
            <aside className="space-y-4 rounded-3xl border border-white/70 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Группы блоков
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Сначала выберите смысловую секцию, потом конкретное поле.
                  </p>
                </div>
                {groupedBlocks.length > 1 ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedGroupId('__all__')}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      Развернуть все
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedGroupId(selectedGroupId)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      Свернуть все
                    </button>
                  </div>
                ) : null}
              </div>

              {groupedBlocks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  По запросу ничего не найдено.
                </div>
              ) : (
                groupedBlocks.map((group) => {
                  const isExpanded =
                    expandedGroupId === '__all__' || expandedGroupId === group.id
                  const dirtyInGroup = group.blocks.filter((block) => block.isDirty).length
                  return (
                    <div key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
                      <button
                        type="button"
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{group.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{group.hint}</div>
                          {dirtyInGroup > 0 ? (
                            <div className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
                              Изменено: {dirtyInGroup}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500">
                            {group.blocks.length}
                          </span>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                            <NavArrowDown
                              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              aria-hidden
                            />
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="space-y-2 border-t border-slate-200 px-3 py-3">
                          {group.blocks.map((b) => {
                            const isActive = selectedBlock?.key === b.key
                            const presentation = getBlockPresentationMeta(b)
                            const typeBadge = getBlockTypeBadgeMeta(b)
                            return (
                              <button
                                key={b.key}
                                type="button"
                                onClick={() => setSelectedKey(b.key)}
                                className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                                  isActive
                                    ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm'
                                    : 'border-white bg-white hover:border-blue-200 hover:bg-blue-50/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeBadge.className}`}>
                                        {typeBadge.code}
                                      </span>
                                      <div className="truncate font-medium">{presentation.shortTitle}</div>
                                    </div>
                                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">{presentation.helper}</div>
                                    <div className="mt-2 line-clamp-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
                                      {getBlockPreviewValue(b)}
                                    </div>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                                      b.isDirty
                                        ? 'bg-amber-100 text-amber-800'
                                        : b.isInherited
                                          ? 'bg-slate-100 text-slate-600'
                                          : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {b.isDirty ? 'Изменён' : b.isInherited ? 'Default' : 'Override'}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </aside>

            {selectedBlock && (
              <section className="space-y-6 self-start xl:sticky xl:top-6">
                <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        {getBlockGroupMeta(selectedBlock.key).title}
                      </div>
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                        {selectedPresentation?.shortTitle ?? selectedBlock.label}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedPresentation?.helper}
                      </p>
                      <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <summary className="cursor-pointer select-none font-medium text-slate-700">
                          Технические детали
                        </summary>
                        <div className="mt-2 break-all text-sm text-slate-500">
                          Ключ: <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">{selectedBlock.key}</code>
                        </div>
                      </details>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs rounded-full border border-gray-200 px-2 py-1 text-gray-500">
                        {selectedBlock.type === 'short' ? 'Короткий текст' : 'Rich text'}
                      </span>
                      <span
                        className={`text-xs rounded-full border px-2 py-1 ${
                          selectedBlock.isInherited
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {getSourceLabel(selectedBlock.valueSource)}
                      </span>
                      {selectedBlock.isDirty ? (
                        <span className="text-xs rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
                          Есть несохранённые изменения
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Тип поля</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{getBlockFieldLabel(selectedBlock.key)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Текущее состояние</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedBlock.isInherited ? 'Используется default' : 'Сохранён override'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Когда меняется</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        После сохранения и revalidation
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBlock.isInherited ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
                    <div className="font-semibold">Сейчас используется inherited/default значение</div>
                    <p className="mt-1 text-amber-800">
                      Это безопасный режим: витрина показывает рабочее значение, но для этого бренда override ещё не сохранён. Как только нажмёте «Сохранить как override», блок станет независимым.
                    </p>
                    {selectedBlock.defaultText ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-white/70 px-3 py-3 text-xs text-slate-700">
                        <div className="mb-1 font-medium text-slate-900">Default значение</div>
                        <div className="whitespace-pre-wrap">{selectedBlock.defaultText}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Редактирование</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Сначала меняйте смысл блока, затем при необходимости его оформление.
                    </p>
                  </div>

                  {selectedBlock.type === 'short' ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {getBlockFieldLabel(selectedBlock.key)}
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
                    {isImageSrcKey(selectedBlock.key) && (
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
                    ) : isBooleanKey(selectedBlock.key) ? (
                      <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={parseBooleanText(selectedBlock.text, false)}
                          onChange={(e) =>
                            updateBlock(selectedBlock.key, {
                              text: e.target.checked ? '1' : '0',
                            })
                          }
                        />
                        <span className="text-sm text-gray-700">Показывать элемент на витрине</span>
                      </label>
                    ) : isSortOrderKey(selectedBlock.key) ? (
                      <input
                        className="form-input w-full"
                        type="number"
                        step={1}
                        value={selectedBlock.text}
                        onChange={(e) =>
                          updateBlock(selectedBlock.key, {
                            text: e.target.value,
                          })
                        }
                      />
                    ) : isCategorySlugKey(selectedBlock.key) ? (
                      <select
                        className="form-input w-full"
                        value={selectedBlock.text}
                        onChange={(e) =>
                          updateBlock(selectedBlock.key, {
                            text: e.target.value,
                          })
                        }
                      >
                        <option value="">Не выбрано</option>
                        {categoryOptions.map((option) => (
                          <option key={option.id} value={option.slug}>
                            {option.title} ({option.slug})
                          </option>
                        ))}
                      </select>
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
                        placeholder={getBlockPlaceholder(selectedBlock.key)}
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
                    />
                  </div>
                )}
                </div>

                {selectedBlock.key !== 'categories.fontVariant' && (
                  <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Оформление текста</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Эти настройки меняют только визуальную подачу блока и не влияют на сам контент.
                      </p>
                    </div>
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
                  </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Действия</h3>
                      <p className="text-sm text-slate-300">
                        Сохранение создаёт override только для текущих изменённых полей.
                      </p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                      Несохранённых изменений: {dirtyCount}
                    </div>
                  </div>
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
