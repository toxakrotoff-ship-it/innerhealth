import { describe, expect, it } from 'vitest'
import { hasVisibleProductText, shouldHideInnerProductDescription } from './product-description-dedupe'

describe('hasVisibleProductText', () => {
  it.each([null, '', '  ', '<p></p>', '<p><br></p>', '<p>&nbsp; &#160; &#xA0;\u200B</p>'])(
    'does not render an empty editor block: %s', (text) => {
      expect(hasVisibleProductText(text)).toBe(false)
    }
  )

  it.each(['Описание', '<p>Описание товара</p>', '<p><img src="/product.jpg" alt="Товар"></p>', '<video src="/product.mp4"></video>'])(
    'preserves content and media: %s', (text) => {
      expect(hasVisibleProductText(text)).toBe(true)
    }
  )
})

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
