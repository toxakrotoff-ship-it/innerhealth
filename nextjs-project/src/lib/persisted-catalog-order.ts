interface ItemWithId {
  id: string
}

export function parsePersistedCatalogOrder(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  } catch {
    return []
  }
}

export function applyPersistedCatalogOrder<T extends ItemWithId>(
  items: readonly T[],
  persistedIds: readonly string[]
): T[] {
  if (persistedIds.length === 0) return [...items]

  const byId = new Map(items.map((item) => [item.id, item]))
  const inOrder = persistedIds
    .map((id) => byId.get(id))
    .filter((item): item is T => Boolean(item))
  const orderedIds = new Set(inOrder.map((item) => item.id))
  const rest = items.filter((item) => !orderedIds.has(item.id))
  return [...inOrder, ...rest]
}
