import { sanitizeProductText, sanitizeProductTitleInput } from '@/lib/sanitize-text'

export const DEFAULT_PRODUCT_TAB_TITLES = [
  'Преимущества',
  'Состав',
  'Способ применения и дозировка',
  'Характеристики',
] as const

export type ProductTabContentKey = 'tab1' | 'tab2' | 'tab3' | 'tab4'
export type ProductTabTitleKey = 'tab1Title' | 'tab2Title' | 'tab3Title' | 'tab4Title'
export type ProductTabEditorType = 'richtext' | 'characteristics'
export type ProductSystemSectionKey =
  | 'description'
  | 'characteristics'
  | 'composition'
  | 'usage'
  | 'nutrition'
  | 'release_form'
  | 'manufacturer'
  | 'storage'
  | 'contraindications'
  | 'documents'
  | 'faq'
  | 'reviews'

export const PRODUCT_SYSTEM_SECTION_ORDER: ProductSystemSectionKey[] = [
  'description',
  'characteristics',
  'composition',
  'usage',
  'nutrition',
  'release_form',
  'manufacturer',
  'storage',
  'contraindications',
  'documents',
  'faq',
  'reviews',
]

export const PRODUCT_SYSTEM_SECTION_META: Record<
  ProductSystemSectionKey,
  { title: string; editorType: ProductTabEditorType }
> = {
  description: { title: 'Описание', editorType: 'richtext' },
  characteristics: { title: 'Характеристики', editorType: 'characteristics' },
  composition: { title: 'Состав', editorType: 'richtext' },
  usage: { title: 'Способ применения', editorType: 'richtext' },
  nutrition: { title: 'Пищевая ценность / активные компоненты', editorType: 'richtext' },
  release_form: { title: 'Форма выпуска', editorType: 'richtext' },
  manufacturer: { title: 'Производитель', editorType: 'richtext' },
  storage: { title: 'Условия хранения', editorType: 'richtext' },
  contraindications: { title: 'Противопоказания и аллергены', editorType: 'richtext' },
  documents: { title: 'Документы', editorType: 'richtext' },
  faq: { title: 'Вопросы и ответы', editorType: 'richtext' },
  reviews: { title: 'Отзывы', editorType: 'richtext' },
}

const PRODUCT_SYSTEM_SECTION_KEY_SET = new Set<ProductSystemSectionKey>(PRODUCT_SYSTEM_SECTION_ORDER)

export interface ProductTabFields {
  description?: string | null
  text?: string | null
  tab1?: string | null
  tab2?: string | null
  tab3?: string | null
  tab4?: string | null
  tab1Title?: string | null
  tab2Title?: string | null
  tab3Title?: string | null
  tab4Title?: string | null
  tabs?: unknown
  characteristicsNutrition100g?: string | null
  characteristicsKkal?: string | null
  characteristicsContraindications?: string | null
  characteristicsShelfLife?: string | null
  characteristicsShelfLife2?: string | null
  characteristicsNutrition100gProduct?: string | null
  characteristicsEnergyValue100g?: string | null
  characteristicsNutrition100g2?: string | null
  characteristicsNutritionPerPortion5g?: string | null
  characteristicsComposition?: string | null
  characteristicsKkal100gDailyDose?: string | null
  characteristicsFormulation?: string | null
  characteristicsCalorie?: string | null
  characteristicsFlacon200ml?: string | null
  characteristicsStorage?: string | null
}

export interface ProductTabItem {
  title: string
  content: string
}

export interface ProductTabEditorItem {
  id: string
  title: string
  content: string
  editorType: ProductTabEditorType
  key?: string | null
  isVisible?: boolean
}

export interface ProductContentSection {
  key: string
  title: string
  content: string
  editorType: ProductTabEditorType
  sortOrder: number
  kind: 'system' | 'custom'
}

export interface NormalizedProductContent {
  shortDescription: string | null
  sections: ProductContentSection[]
}

function createTabId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isEditorType(value: unknown): value is ProductTabEditorType {
  return value === 'richtext' || value === 'characteristics'
}

function isSystemSectionKey(value: unknown): value is ProductSystemSectionKey {
  return typeof value === 'string' && PRODUCT_SYSTEM_SECTION_KEY_SET.has(value as ProductSystemSectionKey)
}

function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function stripHtmlMarkup(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function inferSystemSectionKey(
  title: string,
  editorType: ProductTabEditorType
): ProductSystemSectionKey | null {
  const normalized = title.trim().toLocaleLowerCase('ru')
  if (editorType === 'characteristics') return 'characteristics'
  if (!normalized) return null
  if (normalized.includes('состав')) return 'composition'
  if (normalized.includes('примен')) return 'usage'
  if (normalized.includes('дозиров')) return 'usage'
  if (normalized.includes('пище')) return 'nutrition'
  if (normalized.includes('активн')) return 'nutrition'
  if (normalized.includes('форма')) return 'release_form'
  if (normalized.includes('производ')) return 'manufacturer'
  if (normalized.includes('хранен')) return 'storage'
  if (normalized.includes('срок годности')) return 'storage'
  if (normalized.includes('противопоказ')) return 'contraindications'
  if (normalized.includes('аллерген')) return 'contraindications'
  if (normalized.includes('документ')) return 'documents'
  if (normalized.includes('вопрос')) return 'faq'
  if (normalized.includes('faq')) return 'faq'
  if (normalized.includes('отзыв')) return 'reviews'
  if (normalized.includes('характерист')) return 'characteristics'
  if (normalized.includes('описан')) return 'description'
  return null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtmlTableFromRows(rows: Array<{ label: string; value: string }>): string {
  const normalizedRows = rows
    .map((row) => ({
      label: row.label.trim(),
      value: row.value.trim(),
    }))
    .filter((row) => row.label.length > 0 && row.value.length > 0)

  if (normalizedRows.length === 0) return ''

  const body = normalizedRows
    .map(
      (row) =>
        `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`
    )
    .join('')

  return `<table class="product-characteristics-table" data-product-characteristics="1"><tbody>${body}</tbody></table>`
}

function createSystemTab(
  key: ProductSystemSectionKey,
  content: string,
  overrides?: Partial<Pick<ProductTabEditorItem, 'id' | 'title' | 'editorType' | 'isVisible'>>
): ProductTabEditorItem {
  const meta = PRODUCT_SYSTEM_SECTION_META[key]
  return {
    id: overrides?.id ?? createTabId(),
    key,
    title: overrides?.title ?? meta.title,
    content,
    editorType: overrides?.editorType ?? meta.editorType,
    isVisible: overrides?.isVisible ?? true,
  }
}

function getFieldFallbackSections(product: ProductTabFields): Map<ProductSystemSectionKey, string> {
  const map = new Map<ProductSystemSectionKey, string>()

  const text = trimToNull(product.text)
  if (text) map.set('description', text)

  const composition = trimToNull(product.characteristicsComposition)
  if (composition) {
    map.set('composition', `<p>${escapeHtml(composition)}</p>`)
  }

  const releaseForm = trimToNull(product.characteristicsFormulation)
  if (releaseForm) {
    map.set('release_form', `<p>${escapeHtml(releaseForm)}</p>`)
  }

  const storageRows = [
    { label: 'Условия хранения', value: product.characteristicsStorage ?? '' },
    { label: 'Срок годности', value: product.characteristicsShelfLife ?? '' },
    { label: 'Дополнительно', value: product.characteristicsShelfLife2 ?? '' },
  ].filter((row) => trimToNull(row.value))
  const storageTable = buildHtmlTableFromRows(
    storageRows.map((row) => ({ label: row.label, value: row.value }))
  )
  if (storageTable) map.set('storage', storageTable)

  const contraindications = trimToNull(product.characteristicsContraindications)
  if (contraindications) {
    map.set('contraindications', `<p>${escapeHtml(contraindications)}</p>`)
  }

  const nutritionRows = [
    { label: 'Пищевая ценность (100 г)', value: product.characteristicsNutrition100g ?? '' },
    { label: 'Пищевая ценность продукта', value: product.characteristicsNutrition100gProduct ?? '' },
    { label: 'Пищевая ценность', value: product.characteristicsNutrition100g2 ?? '' },
    { label: 'На порцию 5 г', value: product.characteristicsNutritionPerPortion5g ?? '' },
    { label: 'Энергетическая ценность (100 г)', value: product.characteristicsEnergyValue100g ?? '' },
    { label: 'кКал', value: product.characteristicsKkal ?? '' },
    { label: 'Суточная доза', value: product.characteristicsKkal100gDailyDose ?? '' },
    { label: 'Калорийность', value: product.characteristicsCalorie ?? '' },
    { label: 'Флакон 200 мл', value: product.characteristicsFlacon200ml ?? '' },
  ].filter((row) => trimToNull(row.value))
  const nutritionTable = buildHtmlTableFromRows(
    nutritionRows.map((row) => ({ label: row.label, value: row.value }))
  )
  if (nutritionTable) map.set('nutrition', nutritionTable)

  return map
}

export function parseProductTabsJson(input: unknown): ProductTabEditorItem[] | null {
  if (!Array.isArray(input) || input.length === 0) return null

  const parsed: ProductTabEditorItem[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const content = typeof record.content === 'string' ? record.content : ''
    const title = typeof record.title === 'string' ? record.title : ''
    const editorType = isEditorType(record.editorType) ? record.editorType : 'richtext'
    const id = typeof record.id === 'string' && record.id.trim() ? record.id : createTabId()
    const key =
      typeof record.key === 'string' && record.key.trim()
        ? record.key.trim()
        : inferSystemSectionKey(title, editorType)
    const isVisible = typeof record.isVisible === 'boolean' ? record.isVisible : true
    parsed.push({ id, title, content, editorType, key, isVisible })
  }

  return parsed.length > 0 ? parsed : null
}

export function productTabsFromLegacyFields(product: ProductTabFields): ProductTabEditorItem[] {
  const contentKeys: ProductTabContentKey[] = ['tab1', 'tab2', 'tab3', 'tab4']
  const titleKeys: ProductTabTitleKey[] = ['tab1Title', 'tab2Title', 'tab3Title', 'tab4Title']

  return contentKeys
    .map<ProductTabEditorItem | null>((contentKey, index) => {
      const content = product[contentKey]
      if (!content?.trim()) return null
      const customTitle = product[titleKeys[index]]?.trim()
      const defaultTitle = DEFAULT_PRODUCT_TAB_TITLES[index] ?? ''
      return {
        id: createTabId(),
        key: inferSystemSectionKey(customTitle || defaultTitle, index === 3 ? 'characteristics' : 'richtext'),
        title: customTitle || defaultTitle,
        content,
        editorType: index === 3 ? ('characteristics' as const) : ('richtext' as const),
        isVisible: true,
      }
    })
    .filter((tab): tab is ProductTabEditorItem => tab !== null)
}

export function productTabsForEditor(product: ProductTabFields): ProductTabEditorItem[] {
  const fromJson = parseProductTabsJson(product.tabs)
  if (fromJson) return fromJson
  return productTabsFromLegacyFields(product)
}

export function buildProductTabs(product: ProductTabFields): ProductTabItem[] {
  const fromJson = parseProductTabsJson(product.tabs)
  if (fromJson) {
    return fromJson
      .filter((tab) => tab.isVisible !== false && tab.content.trim().length > 0)
      .map((tab) => ({
        title: tab.title.trim() || 'Таб',
        content: tab.content,
      }))
  }

  const contentKeys: ProductTabContentKey[] = ['tab1', 'tab2', 'tab3', 'tab4']
  const titleKeys: ProductTabTitleKey[] = ['tab1Title', 'tab2Title', 'tab3Title', 'tab4Title']

  return contentKeys
    .map((contentKey, index) => {
      const content = product[contentKey]
      if (!content) return null
      const customTitle = product[titleKeys[index]]?.trim()
      return {
        title: customTitle || DEFAULT_PRODUCT_TAB_TITLES[index],
        content,
      }
    })
    .filter((tab): tab is ProductTabItem => tab !== null)
}

export function normalizeInnerProductContent(product: ProductTabFields): NormalizedProductContent {
  const explicitTabs = productTabsForEditor(product)
  const fallbackSections = getFieldFallbackSections(product)
  const managedTabs = explicitTabs.some((tab) => typeof tab.key === 'string' || tab.isVisible === false)
  const seenKeys = new Set<string>()
  const sections: ProductContentSection[] = []

  const addSection = (
    key: string,
    title: string,
    content: string,
    editorType: ProductTabEditorType,
    sortOrder: number,
    kind: 'system' | 'custom'
  ) => {
    const normalizedContent = trimToNull(content)
    if (!normalizedContent) return
    if (seenKeys.has(key) && kind === 'system') return
    if (kind === 'system') seenKeys.add(key)
    sections.push({ key, title, content: normalizedContent, editorType, sortOrder, kind })
  }

  explicitTabs.forEach((tab, index) => {
    const tabKey = trimToNull(tab.key) ?? `custom:${tab.id}`
    const isSystem = isSystemSectionKey(tab.key)
    if (tab.isVisible === false) {
      if (isSystem) seenKeys.add(tab.key)
      return
    }
    if (!trimToNull(tab.content)) {
      if (isSystem && managedTabs) seenKeys.add(tab.key)
      return
    }
    addSection(
      isSystem ? tab.key : tabKey,
      tab.title.trim() || (isSystem ? PRODUCT_SYSTEM_SECTION_META[tab.key].title : 'Таб'),
      tab.content,
      tab.editorType,
      managedTabs ? index : PRODUCT_SYSTEM_SECTION_ORDER.indexOf(tab.key as ProductSystemSectionKey) >= 0
        ? PRODUCT_SYSTEM_SECTION_ORDER.indexOf(tab.key as ProductSystemSectionKey)
        : 100 + index,
      isSystem ? 'system' : 'custom'
    )
  })

  PRODUCT_SYSTEM_SECTION_ORDER.forEach((key, index) => {
    if (seenKeys.has(key)) return
    const fallback = fallbackSections.get(key)
    if (!fallback) return
    addSection(
      key,
      PRODUCT_SYSTEM_SECTION_META[key].title,
      fallback,
      PRODUCT_SYSTEM_SECTION_META[key].editorType,
      managedTabs ? explicitTabs.length + index : index,
      'system'
    )
  })

  sections.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.title.localeCompare(b.title, 'ru')
  })

  const shortDescriptionPlain = trimToNull(product.description)
  const shortDescription = shortDescriptionPlain ? stripHtmlMarkup(shortDescriptionPlain) : null

  return {
    shortDescription,
    sections,
  }
}

export function buildInnerProductTabsForEditor(product: ProductTabFields): ProductTabEditorItem[] {
  const explicitTabs = productTabsForEditor(product)
  const fallbackSections = getFieldFallbackSections(product)
  const explicitSystemTabs = new Map<ProductSystemSectionKey, ProductTabEditorItem>()
  const customTabs: ProductTabEditorItem[] = []

  explicitTabs.forEach((tab) => {
    const key = isSystemSectionKey(tab.key)
      ? tab.key
      : inferSystemSectionKey(tab.title, tab.editorType)

    if (key && !explicitSystemTabs.has(key)) {
      explicitSystemTabs.set(key, {
        ...tab,
        key,
        title: tab.title.trim() || PRODUCT_SYSTEM_SECTION_META[key].title,
        editorType: key === 'characteristics' ? 'characteristics' : tab.editorType,
        isVisible: tab.isVisible ?? true,
      })
      return
    }

    customTabs.push({
      ...tab,
      key: null,
      isVisible: tab.isVisible ?? true,
    })
  })

  const systemTabs = PRODUCT_SYSTEM_SECTION_ORDER.map((key) => {
    const existing = explicitSystemTabs.get(key)
    if (existing) {
      return {
        ...existing,
        key,
        title: PRODUCT_SYSTEM_SECTION_META[key].title,
        editorType: PRODUCT_SYSTEM_SECTION_META[key].editorType,
        isVisible: existing.isVisible ?? true,
      }
    }

    return createSystemTab(key, fallbackSections.get(key) ?? '', {
      isVisible: false,
    })
  })

  return [...systemTabs, ...customTabs]
}

export function sanitizeProductTabEditorItems(
  tabs: ProductTabEditorItem[]
): ProductTabEditorItem[] {
  return tabs.map((tab) => ({
    ...tab,
    title: sanitizeProductTitleInput(tab.title),
    content: tab.content,
    editorType: tab.editorType,
    key: typeof tab.key === 'string' && tab.key.trim() ? tab.key.trim() : null,
    isVisible: tab.isVisible !== false,
  }))
}

export function serializeProductTabsForStorage(
  tabs: ProductTabEditorItem[]
): ProductTabEditorItem[] {
  return tabs
    .map((tab) => ({
      id: tab.id,
      title: tab.title.trim(),
      content: tab.content,
      editorType: tab.editorType,
      ...(typeof tab.key === 'string' && tab.key.trim() ? { key: tab.key.trim() } : {}),
      ...(tab.isVisible === false ? { isVisible: false } : {}),
    }))
    .filter((tab) => tab.title.length > 0 || tab.content.trim().length > 0)
}

export function syncLegacyTabFieldsFromTabs(
  tabs: ProductTabEditorItem[]
): Record<ProductTabContentKey | ProductTabTitleKey, string | null> {
  const contentKeys: ProductTabContentKey[] = ['tab1', 'tab2', 'tab3', 'tab4']
  const titleKeys: ProductTabTitleKey[] = ['tab1Title', 'tab2Title', 'tab3Title', 'tab4Title']
  const result = {} as Record<ProductTabContentKey | ProductTabTitleKey, string | null>

  for (let index = 0; index < 4; index += 1) {
    const tab = tabs[index]
    result[contentKeys[index]] = tab?.content?.trim() ? tab.content : null
    result[titleKeys[index]] = tab?.title?.trim() ? sanitizeProductText(tab.title) || null : null
  }

  return result
}

export function createEmptyProductTab(
  editorType: ProductTabEditorType = 'richtext'
): ProductTabEditorItem {
  return {
    id: createTabId(),
    title: '',
    content: '',
    editorType,
    key: null,
    isVisible: true,
  }
}
