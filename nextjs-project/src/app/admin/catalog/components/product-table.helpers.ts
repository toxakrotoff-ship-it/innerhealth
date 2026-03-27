interface ProductLike {
  id: string
}

export function reorderProductsByIds<T extends ProductLike>(
  products: readonly T[],
  activeId: string,
  overId: string
): T[] {
  if (activeId === overId) return [...products]
  const fromIndex = products.findIndex((product) => product.id === activeId)
  const toIndex = products.findIndex((product) => product.id === overId)
  if (fromIndex === -1 || toIndex === -1) return [...products]

  const reordered = [...products]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  return reordered
}

export function applyPersistedOrder<T extends ProductLike>(
  products: readonly T[],
  orderedIds: readonly string[]
): T[] {
  if (orderedIds.length === 0) return [...products]

  const byId = new Map(products.map((product) => [product.id, product]))
  const inOrder = orderedIds
    .map((id) => byId.get(id))
    .filter((product): product is T => Boolean(product))
  const orderedSet = new Set(inOrder.map((product) => product.id))
  const rest = products.filter((product) => !orderedSet.has(product.id))
  return [...inOrder, ...rest]
}

export function toPersistedOrder(products: readonly ProductLike[]): string[] {
  return products.map((product) => product.id)
}
