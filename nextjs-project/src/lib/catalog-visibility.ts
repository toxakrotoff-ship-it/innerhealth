export interface ProductVisibilityRecord {
  isDraft: boolean
}

export function filterVisibleProducts<T extends ProductVisibilityRecord>(products: readonly T[]): T[] {
  return products.filter((product) => !product.isDraft)
}
