/**
 * Shipping line amount for customer-facing notifications.
 * Prefer value persisted at checkout; legacy orders fall back to total minus sum of line totals,
 * which is wrong when stored line prices are catalog prices but order.total includes promos or discount prices.
 */
export function resolveShippingCostForOrderNotify(order: {
  total: number
  deliverySum: number | null
  items: Array<{ quantity: number; price: number }>
}): number {
  if (
    order.deliverySum != null &&
    Number.isFinite(order.deliverySum) &&
    order.deliverySum >= 0
  ) {
    return order.deliverySum
  }
  const itemsSubtotal = order.items.reduce((sum, oi) => sum + oi.quantity * oi.price, 0)
  return Math.max(0, order.total - itemsSubtotal)
}
