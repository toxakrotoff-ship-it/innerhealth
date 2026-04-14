import { describe, expect, it } from 'vitest'
import { formatProductsCountRu } from './ru-product-count'

describe('formatProductsCountRu', () => {
  it('uses товар for 1, 21, 31 and товаров for 11', () => {
    expect(formatProductsCountRu(1)).toBe('1 товар')
    expect(formatProductsCountRu(21)).toBe('21 товар')
    expect(formatProductsCountRu(11)).toBe('11 товаров')
  })

  it('uses товара for 2–4 and 22–24', () => {
    expect(formatProductsCountRu(2)).toBe('2 товара')
    expect(formatProductsCountRu(4)).toBe('4 товара')
    expect(formatProductsCountRu(22)).toBe('22 товара')
  })

  it('uses товаров for 0, 5–20, 25–30, 12–14', () => {
    expect(formatProductsCountRu(0)).toBe('0 товаров')
    expect(formatProductsCountRu(5)).toBe('5 товаров')
    expect(formatProductsCountRu(12)).toBe('12 товаров')
    expect(formatProductsCountRu(14)).toBe('14 товаров')
  })
})
