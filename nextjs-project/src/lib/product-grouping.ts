export interface ProductVariantForListing {
  id: string
  parentUid: string | null
  title: string
  brand: string | null
  sku: string | null
  weight?: number | null
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
  isPartner?: boolean
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
  /** `size` — варианты отличаются только фасовкой (105 г / 210 г). */
  optionKind: VariantOptionKind
}

export type VariantOptionKind = 'flavor' | 'size'

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

  const sizeSuffixMatch = normalized.match(SIZE_SUFFIX_RE)
  if (sizeSuffixMatch) {
    const baseTitle = sizeSuffixMatch[1]?.trim() ?? normalized
    const flavorLabel = sizeSuffixMatch[2]?.replace(/\s+/g, ' ').trim() ?? null
    return { baseTitle, flavorLabel: flavorLabel && flavorLabel.length > 0 ? flavorLabel : null }
  }

  return { baseTitle: normalized, flavorLabel: null }
}

const SIZE_UNIT_PATTERN = String.raw`(?:кг|г|гр|мл|л|шт|капсул\p{L}*|таблет\p{L}*|порци\p{L}*)`
/** «Бульон говяжий сухой, 105 г» → base + «105 г». */
const SIZE_SUFFIX_RE = new RegExp(String.raw`^(.+?),\s*(\d+(?:[.,]\d+)?\s*${SIZE_UNIT_PATTERN})\.?$`, 'iu')
const SIZE_LABEL_RE = new RegExp(String.raw`^(\d+(?:[.,]\d+)?)\s*(${SIZE_UNIT_PATTERN})\.?$`, 'iu')

/** Метка варианта похожа на фасовку: «105 г», «1 кг», «90 капсул». */
export function isSizeLabel(label: string | null | undefined): boolean {
  return !!label && SIZE_LABEL_RE.test(label.trim())
}

function sizeLabelToSortValue(label: string | null): number {
  const match = label?.trim().match(SIZE_LABEL_RE)
  if (!match) return Number.POSITIVE_INFINITY
  const amount = Number(match[1]!.replace(',', '.'))
  const unit = match[2]!.toLowerCase()
  return unit === 'кг' || unit === 'л' ? amount * 1000 : amount
}

function getVariantOptionLabel(variant: ProductVariantForListing): string | null {
  const { flavorLabel } = getBaseTitleAndFlavorLabel(variant.title)
  if (flavorLabel) return flavorLabel
  if (typeof variant.weight === 'number' && Number.isFinite(variant.weight) && variant.weight > 0) {
    return `${variant.weight} г`
  }
  return null
}

/** Все варианты группы отличаются только фасовкой. */
export function getVariantOptionKind(variants: ProductVariantForListing[]): VariantOptionKind {
  return variants.length > 0 && variants.every((variant) => isSizeLabel(getVariantOptionLabel(variant)))
    ? 'size'
    : 'flavor'
}

/** Для фасовок — по возрастанию веса, иначе исходный порядок. */
export function sortVariantsForDisplay(variants: ProductVariantForListing[]): ProductVariantForListing[] {
  if (getVariantOptionKind(variants) !== 'size') return variants
  return [...variants].sort(
    (a, b) => sizeLabelToSortValue(getVariantOptionLabel(a)) - sizeLabelToSortValue(getVariantOptionLabel(b))
  )
}

export function getProductListingSizeLabel(title: string, weight?: number | null): string | null {
  const { flavorLabel } = getBaseTitleAndFlavorLabel(title)
  if (flavorLabel) return flavorLabel
  if (typeof weight === 'number' && Number.isFinite(weight) && weight > 0) return `${weight} г`
  return null
}

/**
 * Title + size badge for catalog cards.
 * When size is taken from a trailing "(…)" / "— …" segment, that segment is
 * omitted from the displayed title so it is not duplicated next to the badge.
 */
export function getProductListingTitlePresentation(
  title: string,
  weight?: number | null
): { displayTitle: string; sizeLabel: string | null } {
  const { baseTitle, flavorLabel } = getBaseTitleAndFlavorLabel(title)
  const sizeLabel = getProductListingSizeLabel(title, weight)
  return {
    displayTitle: flavorLabel && sizeLabel ? baseTitle : title,
    sizeLabel,
  }
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

    const groupedVariants = groupedByParent.get(entry.parentUid)
    if (!groupedVariants || groupedVariants.length === 0) continue
    const variants = sortVariantsForDisplay(groupedVariants)
    if (variants.length === 1) {
      listingItems.push({ kind: 'single', product: variants[0]! })
      continue
    }

    const defaultVariant = pickDefaultVariant(variants)
    const defaultLabels = getBaseTitleAndFlavorLabel(defaultVariant.title)
    const flavorOptions = variants.map((variant) => {
      return {
        id: variant.id,
        label: getVariantOptionLabel(variant),
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
      optionKind: getVariantOptionKind(variants),
    })
  }

  return listingItems
}
