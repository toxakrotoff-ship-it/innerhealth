/**
 * Единый формат номера заказа в письмах и мессенджерах: «#N» при наличии человекочитаемого номера, иначе id заказа (UUID).
 */
export function formatOrderLabel(payload: { orderId: string; orderNumber?: number | null }): string {
  if (typeof payload.orderNumber === 'number' && Number.isFinite(payload.orderNumber) && payload.orderNumber > 0) {
    return `#${payload.orderNumber}`
  }
  return payload.orderId
}
