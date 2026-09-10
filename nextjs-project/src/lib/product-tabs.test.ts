import { describe, expect, it } from 'vitest'
import {
  buildInnerProductTabsForEditor,
  buildProductTabs,
  normalizeInnerProductContent,
  parseProductTabsJson,
  productTabsForEditor,
  productTabsFromLegacyFields,
  serializeProductTabsForStorage,
  syncLegacyTabFieldsFromTabs,
} from './product-tabs'

describe('product-tabs', () => {
  it('builds tabs from legacy tab1-tab4 fields', () => {
    const tabs = buildProductTabs({
      tab1: '<p>Benefits</p>',
      tab2: null,
      tab3: null,
      tab4: '<table></table>',
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: 'Характеристики',
    })

    expect(tabs).toEqual([
      { title: 'Преимущества', content: '<p>Benefits</p>' },
      { title: 'Характеристики', content: '<table></table>' },
    ])
  })

  it('prefers dynamic tabs JSON over legacy fields', () => {
    const tabs = buildProductTabs({
      tab1: '<p>Legacy</p>',
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      tabs: [
        { id: '1', title: 'Состав', content: '<p>Dynamic</p>', editorType: 'richtext' },
      ],
    })

    expect(tabs).toEqual([{ title: 'Состав', content: '<p>Dynamic</p>' }])
  })

  it('converts legacy fields for editor', () => {
    const tabs = productTabsForEditor({
      tab1: null,
      tab2: '<p>Ingredients</p>',
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: 'Состав',
      tab3Title: null,
      tab4Title: null,
    })

    expect(tabs).toHaveLength(1)
    expect(tabs[0]?.title).toBe('Состав')
    expect(tabs[0]?.editorType).toBe('richtext')
  })

  it('marks legacy tab4 as characteristics editor', () => {
    const tabs = productTabsFromLegacyFields({
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: '<table></table>',
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
    })

    expect(tabs[0]?.editorType).toBe('characteristics')
  })

  it('syncs first four dynamic tabs into legacy columns', () => {
    const legacy = syncLegacyTabFieldsFromTabs([
      { id: '1', title: 'A', content: 'one', editorType: 'richtext' },
      { id: '2', title: 'B', content: 'two', editorType: 'richtext' },
      { id: '3', title: '', content: '', editorType: 'richtext' },
    ])

    expect(legacy.tab1).toBe('one')
    expect(legacy.tab1Title).toBe('A')
    expect(legacy.tab2).toBe('two')
    expect(legacy.tab3).toBeNull()
    expect(legacy.tab4).toBeNull()
  })

  it('keeps titled tabs in storage but hides empty content on storefront', () => {
    const stored = serializeProductTabsForStorage([
      { id: '1', title: 'Состав', content: '  ', editorType: 'richtext' },
      { id: '2', title: 'Дозировка', content: '<p>1</p>', editorType: 'richtext' },
    ])

    expect(stored).toHaveLength(2)
    expect(buildProductTabs({ tabs: stored, tab1: null, tab2: null, tab3: null, tab4: null, tab1Title: null, tab2Title: null, tab3Title: null, tab4Title: null })).toHaveLength(1)
  })

  it('parses valid tabs JSON', () => {
    const parsed = parseProductTabsJson([
      { id: 'x', title: 'Состав', content: 'text', editorType: 'characteristics' },
    ])

    expect(parsed).toEqual([
      {
        id: 'x',
        title: 'Состав',
        content: 'text',
        editorType: 'characteristics',
        key: 'characteristics',
        isVisible: true,
      },
    ])
  })

  it('does not mix legacy fallbacks into managed tabs JSON', () => {
    const normalized = normalizeInnerProductContent({
      description: '<p>Короткое описание</p>',
      text: '<p>Подробное описание</p>',
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      characteristicsComposition: 'Коллаген, витамин C',
      tabs: [
        {
          id: 'usage-1',
          key: 'usage',
          title: 'Способ применения',
          content: '<p>По 1 капсуле в день</p>',
          editorType: 'richtext',
          isVisible: true,
        },
        {
          id: 'faq-1',
          key: 'faq',
          title: 'Вопросы и ответы',
          content: '<p>FAQ</p>',
          editorType: 'richtext',
          isVisible: false,
        },
      ],
    })

    expect(normalized.shortDescription).toBe('<p>Короткое описание</p>')
    expect(normalized.sections.map((section) => section.key)).toEqual(['usage'])
  })

  it('does not re-add hidden system sections from fallback fields', () => {
    const normalized = normalizeInnerProductContent({
      description: null,
      text: null,
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      characteristicsNutrition100g: 'белки 95 жиры 0,4 углеводы 0,0',
      characteristicsKkal: '380,5',
      tabs: [
        {
          id: 'nutrition-1',
          title: 'Пищевая ценность / активные компоненты',
          content: '',
          editorType: 'richtext',
          isVisible: false,
        },
      ],
    })

    expect(normalized.sections.map((section) => section.key)).toEqual([])
  })

  it('builds managed inner editor blocks with default system sections', () => {
    const tabs = buildInnerProductTabsForEditor({
      description: null,
      text: '<p>Описание</p>',
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      tabs: null,
    })

    expect(tabs[0]?.key).toBe('description')
    expect(tabs[0]?.content).toBe('<p>Описание</p>')
    expect(tabs[0]?.isVisible).toBe(true)
    expect(tabs[1]?.key).toBe('characteristics')
    expect(tabs[1]?.content).toBe('')
    expect(tabs[1]?.isVisible).toBe(false)
    expect(tabs.every((tab) => typeof tab.isVisible === 'boolean')).toBe(true)
  })

  it('treats an empty tabs array as an explicit removal and never restores legacy tabs', () => {
    const product = {
      description: null,
      text: '<p>Старое описание</p>',
      tab1: '<p>Старые преимущества</p>',
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: 'Преимущества',
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      tabs: [],
    }

    expect(productTabsForEditor(product)).toEqual([])
    expect(buildProductTabs(product)).toEqual([])
    expect(normalizeInnerProductContent(product).sections).toEqual([])

    const editorTabs = buildInnerProductTabsForEditor(product)
    expect(editorTabs.every((tab) => tab.content === '' && tab.isVisible === false)).toBe(true)
  })

  it('keeps missing managed sections empty instead of filling them from legacy fields', () => {
    const tabs = buildInnerProductTabsForEditor({
      description: null,
      text: '<p>Старое описание</p>',
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      tabs: [
        {
          id: 'usage-1',
          key: 'usage',
          title: 'Способ применения',
          content: '<p>Актуальный текст</p>',
          editorType: 'richtext',
        },
      ],
    })

    const description = tabs.find((tab) => tab.key === 'description')
    expect(description).toMatchObject({ content: '', isVisible: false })
  })

  it('trusts an explicit null key from storage instead of re-inferring it from the title', () => {
    const parsed = parseProductTabsJson([
      { id: 'custom-1', title: 'Характеристики', content: 'text', editorType: 'richtext', key: null },
    ])

    expect(parsed).toEqual([
      {
        id: 'custom-1',
        title: 'Характеристики',
        content: 'text',
        editorType: 'richtext',
        key: null,
        isVisible: true,
      },
    ])
  })

  it('infers a system key only when the key field is missing entirely (true legacy data)', () => {
    const parsed = parseProductTabsJson([
      { id: 'legacy-1', title: 'Характеристики', content: 'text', editorType: 'richtext' },
    ])

    expect(parsed?.[0]?.key).toBe('characteristics')
  })

  it('always stores an explicit key (including null) so intent survives a round trip', () => {
    const stored = serializeProductTabsForStorage([
      { id: 'custom-1', title: 'Характеристики', content: '<p>Текст</p>', editorType: 'richtext', key: null },
    ])

    expect(stored[0]).toMatchObject({ key: null })
  })

  it('renders a renamed custom tab alongside a same-titled system tab instead of dropping it', () => {
    const normalized = normalizeInnerProductContent({
      description: null,
      text: null,
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      tabs: [
        {
          id: 'characteristics-1',
          key: 'characteristics',
          title: 'Характеристики',
          content: '<table></table>',
          editorType: 'characteristics',
          isVisible: true,
        },
        {
          id: 'custom-1',
          key: null,
          title: 'Характеристики',
          content: '<p>Переименованный блок преимуществ</p>',
          editorType: 'richtext',
          isVisible: true,
        },
      ],
    })

    expect(normalized.sections).toHaveLength(2)
    expect(normalized.sections.map((section) => section.kind)).toEqual(['system', 'custom'])
  })

  it('preserves explicit system tab order in inner editor', () => {
    const tabs = buildInnerProductTabsForEditor({
      description: null,
      text: '<p>Основной текст</p>',
      tab1: null,
      tab2: null,
      tab3: null,
      tab4: null,
      tab1Title: null,
      tab2Title: null,
      tab3Title: null,
      tab4Title: null,
      tabs: [
        {
          id: 'composition-1',
          key: 'composition',
          title: 'Состав',
          content: '<p>Состав</p>',
          editorType: 'richtext',
          isVisible: true,
        },
        {
          id: 'description-1',
          key: 'description',
          title: 'Описание',
          content: '<p>Описание</p>',
          editorType: 'richtext',
          isVisible: true,
        },
      ],
    })

    expect(tabs[0]?.key).toBe('composition')
    expect(tabs[1]?.key).toBe('description')
  })
})
