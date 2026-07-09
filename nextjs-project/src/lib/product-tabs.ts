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

export interface ProductTabFields {
  tab1: string | null
  tab2: string | null
  tab3: string | null
  tab4: string | null
  tab1Title: string | null
  tab2Title: string | null
  tab3Title: string | null
  tab4Title: string | null
  tabs?: unknown
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
}

function createTabId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isEditorType(value: unknown): value is ProductTabEditorType {
  return value === 'richtext' || value === 'characteristics'
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
    parsed.push({ id, title, content, editorType })
  }

  return parsed.length > 0 ? parsed : null
}

export function productTabsFromLegacyFields(product: ProductTabFields): ProductTabEditorItem[] {
  const contentKeys: ProductTabContentKey[] = ['tab1', 'tab2', 'tab3', 'tab4']
  const titleKeys: ProductTabTitleKey[] = ['tab1Title', 'tab2Title', 'tab3Title', 'tab4Title']

  return contentKeys
    .map((contentKey, index) => {
      const content = product[contentKey]
      if (!content?.trim()) return null
      const customTitle = product[titleKeys[index]]?.trim()
      const defaultTitle = DEFAULT_PRODUCT_TAB_TITLES[index] ?? ''
      return {
        id: createTabId(),
        title: customTitle || defaultTitle,
        content,
        editorType: index === 3 ? ('characteristics' as const) : ('richtext' as const),
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
      .filter((tab) => tab.content.trim().length > 0)
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

export function sanitizeProductTabEditorItems(
  tabs: ProductTabEditorItem[]
): ProductTabEditorItem[] {
  return tabs.map((tab) => ({
    ...tab,
    title: sanitizeProductTitleInput(tab.title),
    content: tab.content,
    editorType: tab.editorType,
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
  }
}
