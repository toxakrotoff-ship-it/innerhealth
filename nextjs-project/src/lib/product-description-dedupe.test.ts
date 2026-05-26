import { describe, expect, it } from 'vitest'
import { shouldHideInnerProductDescription } from './product-description-dedupe'

describe('shouldHideInnerProductDescription', () => {
  it('hides duplicated inner description when text starts with the same content', () => {
    expect(
      shouldHideInnerProductDescription(
        '<p><strong>Лисичка желтая</strong> для ежедневного рациона.</p>',
        '<p><strong>Лисичка желтая</strong> для ежедневного рациона.</p><p>Содержит витамины B<sub>2</sub>.</p>'
      )
    ).toBe(true)
  })

  it('keeps description when long text is different', () => {
    expect(
      shouldHideInnerProductDescription(
        '<p>Краткое описание товара.</p>',
        '<p>Совсем другой расширенный текст без дублирования.</p>'
      )
    ).toBe(false)
  })
})
