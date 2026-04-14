/**
 * Russian plural for «товар»: 1 товар, 2–4 товара (кроме 12–14), иначе товаров.
 */
export function formatProductsCountRu(count: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0))
  const mod10 = n % 10
  const mod100 = n % 100
  let noun: string
  if (mod10 === 1 && mod100 !== 11) {
    noun = 'товар'
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    noun = 'товара'
  } else {
    noun = 'товаров'
  }
  return `${n} ${noun}`
}
