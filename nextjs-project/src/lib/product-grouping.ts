export interface ProductVariantForListing {
  id: string
  parentUid: string | null
  title: string
  brand: string | null
  sku: string | null
  price: number
  priceOld: number | null
  quantity?: number | null
  photo: string | null
  photos?: unknown
  slug: string | null
  isPromoEligible: boolean
  discountPrice: number | null
  isPreorderEnabled?: boolean
}

export interface GroupedFlavorOption {
  id: string
  label: string | null
  isAvailable: boolean
}

export interface ProductListingSingle {
  kind: 'single'
  product: ProductVariantForListing
}

export interface ProductListingGroup {
  kind: 'group'
  parentUid: string
  variants: ProductVariantForListing[]
  defaultVariantId: string
  baseTitle: string
  flavorOptions: GroupedFlavorOption[]
}

export type ProductListingItem = ProductListingSingle | ProductListingGroup

function isVariantAvailable(variant: ProductVariantForListing): boolean {
  return variant.quantity == null || variant.quantity > 0 || variant.isPreorderEnabled
}

function normalizeParentUid(parentUid: string | null): string | null {
  if (!parentUid) return null
  const trimmed = parentUid.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getBaseTitleAndFlavorLabel(title: string): { baseTitle: string; flavorLabel: string | null } {
  const normalized = title.trim()
  if (!normalized) return { baseTitle: title, flavorLabel: null }

  const dashSeparatorMatch = normalized.match(/^(.+?)\s(?:—|-)\s(.+)$/)
  if (dashSeparatorMatch) {
    const baseTitle = dashSeparatorMatch[1]?.trim() ?? normalized
    const flavorLabel = dashSeparatorMatch[2]?.trim() ?? null
    return { baseTitle, flavorLabel: flavorLabel && flavorLabel.length > 0 ? flavorLabel : null }
  }

  const parenthesisMatch = normalized.match(/^(.*)\(([^()]+)\)\s*$/)
  if (parenthesisMatch) {
    const baseTitle = parenthesisMatch[1]?.trim() ?? normalized
    const flavorLabel = parenthesisMatch[2]?.trim() ?? null
    return { baseTitle, flavorLabel: flavorLabel && flavorLabel.length > 0 ? flavorLabel : null }
  }

  return { baseTitle: normalized, flavorLabel: null }
}

export function pickDefaultVariant(variants: ProductVariantForListing[]): ProductVariantForListing {
  const sorted = [...variants].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  const available = sorted.find((variant) => isVariantAvailable(variant))
  return available ?? sorted[0]!
}

export function groupProductsForListing(items: ProductVariantForListing[]): ProductListingItem[] {
  const groupedByParent = new Map<string, ProductVariantForListing[]>()
  const listingItems: ProductListingItem[] = []

  for (const item of items) {
    const parentUid = normalizeParentUid(item.parentUid)
    if (!parentUid) {
      listingItems.push({ kind: 'single', product: item })
      continue
    }
    const existing = groupedByParent.get(parentUid)
    if (existing) existing.push(item)
    else groupedByParent.set(parentUid, [item])
  }

  for (const [parentUid, variants] of Array.from(groupedByParent.entries())) {
    if (variants.length === 1) {
      listingItems.push({ kind: 'single', product: variants[0]! })
      continue
    }

    const defaultVariant = pickDefaultVariant(variants)
    const defaultLabels = getBaseTitleAndFlavorLabel(defaultVariant.title)
    const flavorOptions = variants.map((variant) => {
      const labels = getBaseTitleAndFlavorLabel(variant.title)
      return {
        id: variant.id,
        label: labels.flavorLabel,
        isAvailable: isVariantAvailable(variant),
      }
    })

    listingItems.push({
      kind: 'group',
      parentUid,
      variants,
      defaultVariantId: defaultVariant.id,
      baseTitle: defaultLabels.baseTitle,
      flavorOptions,
    })
  }

  return listingItems
}
