import type { CartLine } from '@/store/cart-store'

/** Lines that affect CDEK parcel weight/dimensions (gifts are excluded at checkout too). */
export function getCdekWidgetCartLines(items: readonly CartLine[]): CartLine[] {
  return items.filter((item) => item.isGift !== true)
}

export function buildCdekWidgetItemsSignature(items: readonly CartLine[]): string {
  return getCdekWidgetCartLines(items)
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join('|')
}

/** Product set only — quantity changes should not force a full widget remount. */
export function buildCdekWidgetProductSetSignature(items: readonly CartLine[]): string {
  return getCdekWidgetCartLines(items)
    .map((item) => item.productId)
    .sort()
    .join('|')
}
