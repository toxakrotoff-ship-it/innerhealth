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

  it('normalizes inner content with system block visibility and legacy fallbacks', () => {
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
    expect(normalized.sections.map((section) => section.key)).toEqual([
      'usage',
      'description',
      'composition',
    ])
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
    expect(tabs[1]?.key).toBe('characteristics')
    expect(tabs.every((tab) => typeof tab.isVisible === 'boolean')).toBe(true)
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
