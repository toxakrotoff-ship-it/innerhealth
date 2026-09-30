// Only named UI transitions are persisted. Free-form text, addresses, contact data,
// error messages and stacks never enter the checkout timeline.
export const cartActivityActions = [
  'page_mounted', 'cart_quantity_changed', 'cart_item_removed',
  'promo_apply_started', 'promo_apply_result', 'saved_address_selected',
  'saved_address_used', 'saved_address_cleared', 'contact_field_completed',
  'privacy_changed', 'delivery_mode_changed', 'cdek_input_mode_changed',
  'manual_mode_auto_fallback', 'manual_city_selected', 'manual_pvz_chosen',
  'manual_pvz_cleared', 'manual_points_loaded', 'manual_points_failed',
  'manual_tariff_ready', 'manual_tariff_failed', 'manual_tariff_retry',
  'cdek_map_slow',
  'cdek_widget_mode_change', 'cdek_widget_choose', 'cdek_widget_calculate',
  'cdek_widget_status', 'checkout_validation_failed', 'checkout_submit_start',
  'checkout_submit_failed', 'checkout_submit_error', 'checkout_submit_success',
  'resolve_city_failed', 'resolve_city_empty', 'resolve_city_error',
  'resolve_city_success', 'config_failed', 'init_failed', 'init_timeout',
  'missing_yandex_maps_key', 'parcels_sync_failed', 'init_start',
  'config_loaded', 'ready', 'retry', 'expand_offices_background_failed',
] as const

export interface CartActivityEvent {
  id: string
  action: (typeof cartActivityActions)[number]
  scope: 'cart' | 'cdek-widget' | 'cdek-api'
  occurredAt: string
  data?: Record<string, unknown>
}

const stringValues: Record<string, readonly string[]> = {
  deliveryMethod: ['pickup', 'cdek_pvz', 'cdek_door'],
  previous: ['pickup', 'cdek_pvz', 'cdek_door'],
  mode: ['map', 'manual'],
  field: ['fullName', 'phone', 'email'],
  reason: ['missing_contact', 'invalid_phone', 'invalid_email', 'missing_city_code',
    'missing_pvz_or_tariff', 'missing_door_tariff', 'missing_door_address',
    'privacy_not_accepted'],
  brandId: ['inner', 'sprint-power'],
  widgetStatus: ['loading', 'ready', 'error'],
}
const numericKeys = new Set([
  'itemsCount', 'quantity', 'previousQuantity', 'cityCode', 'tariffCode',
  'pvzTariffCode', 'doorTariffCode', 'deliverySum', 'status', 'pointsCount',
  'officeCount', 'doorCount',
  'viewportWidth', 'initGeneration', 'fallbackCityCode', 'geoRegionCode',
])
const booleanKeys = new Set([
  'valid', 'accepted', 'success', 'usingSavedAddress', 'hasWidgetTariffSelection',
  'hasConfirmationUrl', 'hasDoorAddress',
  'isMobile', 'online',
  'canUseSavedAddresses', 'geoDenied', 'isMobileClient', 'shouldBackgroundExpandCountry',
])

export function sanitizeCartActivityData(data: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  if (!data) return {}
  const safe: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'pvzCode' && typeof value === 'string' && /^[A-Za-z0-9-]{1,32}$/.test(value)) {
      safe[key] = value
    } else if (key === 'productId' && typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value)) {
      safe[key] = value
    } else if (stringValues[key]?.includes(value as string)) {
      safe[key] = value as string
    } else if (numericKeys.has(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000) {
      safe[key] = value
    } else if (booleanKeys.has(key) && typeof value === 'boolean') {
      safe[key] = value
    }
  }
  return safe
}

export function cartActivityTimestamp(occurredAt: string, now = new Date()): Date {
  const time = new Date(occurredAt).getTime()
  return Number.isFinite(time) && Math.abs(time - now.getTime()) <= 10 * 60_000
    ? new Date(time)
    : now
}
