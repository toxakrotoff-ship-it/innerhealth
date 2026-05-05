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
  /** Sprint Power: "details" should open the category page instead of PDP. */
  primaryCategorySlug?: string | null
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

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function normalizeParentUid(parentUid: string | null): string | null {
  if (!parentUid) return null
  const trimmed = parentUid.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getBaseTitleAndFlavorLabel(title: string): { baseTitle: string; flavorLabel: string | null } {
  const normalized = decodeHtmlEntities(title).trim()
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
  const singlesById = new Map<string, ProductVariantForListing>()
  const listingOrder: Array<{ kind: 'single'; id: string } | { kind: 'group'; parentUid: string }> = []

  for (const item of items) {
    const parentUid = normalizeParentUid(item.parentUid)
    if (!parentUid) {
      singlesById.set(item.id, item)
      listingOrder.push({ kind: 'single', id: item.id })
      continue
    }
    const existing = groupedByParent.get(parentUid)
    if (existing) {
      existing.push(item)
    } else {
      groupedByParent.set(parentUid, [item])
      listingOrder.push({ kind: 'group', parentUid })
    }
  }

  const listingItems: ProductListingItem[] = []
  for (const entry of listingOrder) {
    if (entry.kind === 'single') {
      const product = singlesById.get(entry.id)
      if (product) listingItems.push({ kind: 'single', product })
      continue
    }

    const variants = groupedByParent.get(entry.parentUid)
    if (!variants || variants.length === 0) continue
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
      parentUid: entry.parentUid,
      variants,
      defaultVariantId: defaultVariant.id,
      baseTitle: defaultLabels.baseTitle,
      flavorOptions,
    })
  }

  return listingItems
}
