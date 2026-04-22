function formatRuCountWithNoun(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0))
  const mod10 = n % 10
  const mod100 = n % 100
  let noun: string
  if (mod10 === 1 && mod100 !== 11) {
    noun = one
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    noun = few
  } else {
    noun = many
  }
  return `${n} ${noun}`
}

/**
 * Russian plural for «товар»: 1 товар, 2–4 товара (кроме 12–14), иначе товаров.
 */
export function formatProductsCountRu(count: number): string {
  return formatRuCountWithNoun(count, 'товар', 'товара', 'товаров')
}

/**
 * Подпись на плитке категории «Акции»: сумма товаров в категории и активных акций с подарками на сайте.
 */
export function formatAktsiiCatalogBlockSubtitleRu(
  productCount: number,
  sitePromotionCount: number
): string {
  const p = Math.max(0, Math.floor(Number.isFinite(productCount) ? productCount : 0))
  const g = Math.max(0, Math.floor(Number.isFinite(sitePromotionCount) ? sitePromotionCount : 0))
  return formatProductsCountRu(p + g)
}
