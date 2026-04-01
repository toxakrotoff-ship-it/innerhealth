function normalizeLocationValue(
  value: unknown,
  options: { stripAddress?: boolean } = {}
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined

  const source = value as Record<string, unknown>
  const codeRaw = source.code
  const code =
    typeof codeRaw === 'number'
      ? codeRaw
      : typeof codeRaw === 'string'
        ? Number.parseInt(codeRaw.trim(), 10)
        : Number.NaN

  const postalCode =
    typeof source.postal_code === 'string' && source.postal_code.trim().length > 0
      ? source.postal_code.trim()
      : undefined
  const cityUuid =
    typeof source.city_uuid === 'string' && source.city_uuid.trim().length > 0
      ? source.city_uuid.trim()
      : undefined

  const countryCode =
    typeof source.country_code === 'string' && source.country_code.trim().length > 0
      ? source.country_code.trim()
      : 'RU'

  const location: Record<string, unknown> = {}
  if (Number.isFinite(code) && code > 0) {
    location.code = code
  } else if (cityUuid) {
    location.city_uuid = cityUuid
  } else if (postalCode) {
    location.postal_code = postalCode
  }

  if (countryCode) location.country_code = countryCode

  const deliveryPoint =
    typeof source.delivery_point === 'string' && source.delivery_point.trim().length > 0
      ? source.delivery_point.trim().toUpperCase()
      : undefined
  if (deliveryPoint) location.delivery_point = deliveryPoint

  if (!options.stripAddress) {
    const address =
      typeof source.address === 'string' && source.address.trim().length > 0
        ? source.address.trim()
        : undefined
    const city =
      typeof source.city === 'string' && source.city.trim().length > 0 ? source.city.trim() : undefined
    if (address) location.address = address
    if (city) location.city = city
  }

  return Object.keys(location).length > 0 ? location : undefined
}

export function normalizeWidgetPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const action = payload.action
  if (action !== 'calculate') return payload

  const normalized: Record<string, unknown> = { ...payload }

  const fromLocation =
    normalized.from_location != null
      ? normalizeLocationValue(normalized.from_location, { stripAddress: true })
      : normalizeLocationValue(normalized.from, { stripAddress: true })
  if (fromLocation) {
    normalized.from_location = fromLocation
  } else {
    delete normalized.from_location
  }

  const toLocation =
    normalized.to_location != null
      ? normalizeLocationValue(normalized.to_location)
      : normalizeLocationValue(normalized.to)
  if (toLocation) {
    normalized.to_location = toLocation
  } else {
    delete normalized.to_location
  }

  if (normalized.packages == null && Array.isArray(normalized.goods)) {
    const goods = normalized.goods as Array<Record<string, unknown>>
    const packages = goods
      .map((g) => {
        const weight = typeof g.weight === 'number' ? g.weight : Number.parseInt(String(g.weight ?? ''), 10)
        const length = typeof g.length === 'number' ? g.length : Number.parseInt(String(g.length ?? ''), 10)
        const width = typeof g.width === 'number' ? g.width : Number.parseInt(String(g.width ?? ''), 10)
        const height = typeof g.height === 'number' ? g.height : Number.parseInt(String(g.height ?? ''), 10)
        if (![weight, length, width, height].every((v) => Number.isFinite(v) && v > 0)) return null
        return { weight, length, width, height }
      })
      .filter((p): p is { weight: number; length: number; width: number; height: number } => p !== null)

    if (packages.length > 0) normalized.packages = packages
  }

  return normalized
}
