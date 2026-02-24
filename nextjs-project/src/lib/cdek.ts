/**
 * Интеграция с API СДЭК (https://apidoc.cdek.ru).
 * Реализовано по разделам документации:
 * - Auth: getOAuthToken (https://apidoc.cdek.ru/#tag/auth/operation/getOAuthToken)
 * - Location: города (https://apidoc.cdek.ru/#tag/location)
 * - Delivery point: поиск ПВЗ (https://apidoc.cdek.ru/#tag/delivery_point/operation/search)
 * - Calculator: расчёт тарифов (https://apidoc.cdek.ru/#tag/calculator)
 * - Orders: создание заказа на отгрузку (https://apidoc.cdek.ru/#tag/orders)
 *
 * Тестовое окружение: CDEK_USE_TEST=true или CDEK_API_BASE=https://api.edu.cdek.ru/v2
 */

import { prisma } from '@/lib/prisma'

const CDEK_API_PRODUCTION = 'https://api.cdek.ru/v2'
const CDEK_API_TEST = 'https://api.edu.cdek.ru/v2'

function getCdekApiBase(): string {
  if (process.env.CDEK_API_BASE) return process.env.CDEK_API_BASE
  if (process.env.CDEK_USE_TEST === 'true' || process.env.CDEK_USE_TEST === '1') {
    return CDEK_API_TEST
  }
  return CDEK_API_PRODUCTION
}

/** Локация для расчёта: код города СДЭК или почтовый индекс */
export interface CdekLocation {
  /** Код населённого пункта СДЭК (приоритет) */
  code?: number
  /** Почтовый индекс (если нет code) */
  postal_code?: string
  /** Код страны ISO 3166-1 alpha-2 */
  country_code?: string
}

/** Пакет для калькулятора: вес в граммах, размеры в мм */
export interface CdekPackage {
  /** Вес в граммах */
  weight: number
  /** Длина в мм */
  length: number
  /** Ширина в мм */
  width: number
  /** Высота в мм */
  height: number
}

/** Запрос калькулятора по одному тарифу */
export interface CdekCalculatorTariffRequest {
  /** Код тарифа (136 — склад-склад, 234 — склад-дверь и т.д.) */
  tariff_code: number
  /** Откуда (склад/магазин) */
  from_location: CdekLocation
  /** Куда (город получателя) */
  to_location: CdekLocation
  /** Посылки с габаритами */
  packages: CdekPackage[]
  /** 1 — интернет-магазин, 2 — доставка */
  type?: 1 | 2
}

/** Запрос списка всех доступных тарифов с ценами */
export interface CdekCalculatorTariffListRequest {
  from_location?: CdekLocation
  to_location: CdekLocation
  packages: CdekPackage[]
  type?: 1 | 2
  /** Валюта: 1 — RUB */
  currency?: number
  date?: string
  lang?: 'rus' | 'eng'
}

/** Элемент ответа калькулятора (тариф с ценой и сроками) */
export interface CdekTariffResult {
  tariff_code: number
  tariff_name?: string
  tariff_description?: string
  delivery_sum: number
  period_min: number
  period_max: number
  calendar_min?: number
  calendar_max?: number
}

/**
 * Тип доставки СДЭК для фильтрации тарифов.
 * До ПВЗ — в пункт выдачи (склад-склад).
 * До адреса — курьером до двери (склад-дверь / дверь-дверь).
 */
export type CdekDeliveryKind = 'pvz' | 'address'

/** Коды тарифов СДЭК: до ПВЗ (пункт выдачи) */
const CDEK_TARIFF_CODES_PVZ = [136, 139, 368]
/** Коды тарифов СДЭК: до адреса (курьером до двери) */
const CDEK_TARIFF_CODES_ADDRESS = [234, 366]

/**
 * Фильтрует тарифы по типу доставки (До ПВЗ / До адреса).
 */
export function filterTariffsByDeliveryKind(
  tariffs: CdekTariffResult[],
  kind: CdekDeliveryKind
): CdekTariffResult[] {
  const codes = kind === 'pvz' ? CDEK_TARIFF_CODES_PVZ : CDEK_TARIFF_CODES_ADDRESS
  return tariffs.filter((t) => codes.includes(t.tariff_code))
}

/** Ответ калькулятора по списку тарифов */
export interface CdekCalculatorTariffListResponse {
  tariffs: CdekTariffResult[]
}

/** Ответ OAuth СДЭК (getOAuthToken) */
interface CdekAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
  jti?: string
}

// --- Location (cities) ---

/** Параметры запроса списка городов (Location) */
export interface CdekCitiesRequest {
  /** Коды стран ISO 3166-1 alpha-2 */
  country_codes?: string[]
  /** Код региона СДЭК */
  region_code?: number
  /** Название города (поиск по совпадению) */
  city?: string
  /** Код города СДЭК */
  code?: number
  /** Почтовый индекс */
  postal_code?: string
  /** ФИАС GUID */
  fias_guid?: string
  size?: number
  page?: number
  lang?: 'rus' | 'eng'
}

/** Элемент города в ответе Location */
export interface CdekCity {
  code: number
  city?: string
  city_guid?: string
  country_code?: string
  country?: string
  region?: string
  region_code?: number
  region_guid?: string
  sub_region?: string
  postal_codes?: string[]
  longitude?: number
  latitude?: number
  time_zone?: string
  payment_limit?: number
  fias_guid?: string
}

/** Ответ Location cities */
export interface CdekCitiesResponse {
  city?: CdekCity[]
}

// --- Delivery points (ПВЗ) ---

/** Фильтр поиска пунктов выдачи */
export interface CdekDeliveryPointsFilter {
  /** Код города СДЭК */
  city_code?: number
  /** Почтовый индекс */
  postal_code?: string
  /** Код страны */
  country_code?: string
  /** Код региона СДЭК */
  region_code?: number
  /** Тип: PVZ, POSTAMAT, ALL */
  type?: 'PVZ' | 'POSTAMAT' | 'ALL'
  /** Код конкретного ПВЗ */
  code?: string
  /** Есть приём наличных */
  have_cashless?: boolean
  /** Есть выдача наличных */
  have_cash?: boolean
  /** Разрешена наложенный платёж */
  allowed_cod?: boolean
  /** Есть примерочная */
  is_dressing_room?: boolean
  /** Макс. вес (кг) */
  weight_max?: number
  /** Мин. вес (кг) */
  weight_min?: number
  /** Только выдача */
  is_handout?: boolean
  /** Приём заказов */
  is_reception?: boolean
  /** Только доставка (take_only) */
  take_only?: boolean
}

/** Запрос списка ПВЗ */
export interface CdekDeliveryPointsRequest {
  filter?: CdekDeliveryPointsFilter
  size?: number
  page?: number
  lang?: 'rus' | 'eng'
}

/** Пункт выдачи (офис/ПВЗ) в ответе */
export interface CdekDeliveryPoint {
  code?: string
  name?: string
  uuid?: string
  work_time?: string
  address?: string
  address_comment?: string
  full_address?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  phones?: Array<{ number?: string }>
  email?: string
  note?: string
  type?: string
  owner_code?: string
  take_only?: boolean
  is_handout?: boolean
  is_reception?: boolean
  is_dressing_room?: boolean
  have_cashless?: boolean
  have_cash?: boolean
  allowed_cod?: boolean
  weight_min?: number
  weight_max?: number
  country_code?: string
  region_code?: number
  region?: string
  city_code?: number
  city?: string
  postal_code?: string
}

/** Ответ поиска ПВЗ */
export interface CdekDeliveryPointsResponse {
  delivery_points?: CdekDeliveryPoint[]
}

const DEFAULT_PACKAGE_WEIGHT_G = 500
const DEFAULT_PACKAGE_DIMENSION_MM = 200

/**
 * Минимальные габариты для одного пакета (если у товара не указаны).
 * СДЭК принимает целые числа; вес в г, размеры в мм.
 */
export function getDefaultCdekPackage(): CdekPackage {
  return {
    weight: DEFAULT_PACKAGE_WEIGHT_G,
    length: DEFAULT_PACKAGE_DIMENSION_MM,
    width: DEFAULT_PACKAGE_DIMENSION_MM,
    height: DEFAULT_PACKAGE_DIMENSION_MM,
  }
}

/**
 * Нормализует габариты товара в один пакет СДЭК.
 * Если размеры не заданы — подставляются дефолты.
 */
export function productToCdekPackage(
  weightG: number | null | undefined,
  lengthMm: number | null | undefined,
  widthMm: number | null | undefined,
  heightMm: number | null | undefined,
  quantity: number
): CdekPackage {
  const w = (weightG ?? DEFAULT_PACKAGE_WEIGHT_G) * quantity
  const l = lengthMm ?? DEFAULT_PACKAGE_DIMENSION_MM
  const wd = widthMm ?? DEFAULT_PACKAGE_DIMENSION_MM
  const h = heightMm ?? DEFAULT_PACKAGE_DIMENSION_MM
  return {
    weight: Math.max(1, Math.round(w)),
    length: Math.max(1, Math.round(l)),
    width: Math.max(1, Math.round(wd)),
    height: Math.max(1, Math.round(h)),
  }
}

/**
 * Суммирует несколько пакетов в один (суммарный вес, макс. габариты).
 * Упрощённая модель: одна коробка на весь заказ.
 */
export function mergeCdekPackages(packages: CdekPackage[]): CdekPackage[] {
  if (packages.length === 0) return [getDefaultCdekPackage()]
  if (packages.length === 1) return packages
  const totalWeight = packages.reduce((s, p) => s + p.weight, 0)
  const maxL = Math.max(...packages.map((p) => p.length))
  const maxW = Math.max(...packages.map((p) => p.width))
  const maxH = Math.max(...packages.map((p) => p.height))
  return [
    {
      weight: totalWeight,
      length: maxL,
      width: maxW,
      height: maxH,
    },
  ]
}

let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Получает OAuth-токен СДЭК (getOAuthToken, кэшируется до истечения).
 * Переменные: CDEK_CLIENT_ID + CDEK_CLIENT_SECRET или CDEK_ACCOUNT + CDEK_SECURE.
 */
export async function getCdekToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }
  const clientId = process.env.CDEK_CLIENT_ID ?? process.env.CDEK_ACCOUNT
  const clientSecret = process.env.CDEK_CLIENT_SECRET ?? process.env.CDEK_SECURE
  if (!clientId || !clientSecret) {
    throw new Error('CDEK: задайте CDEK_CLIENT_ID и CDEK_CLIENT_SECRET (или CDEK_ACCOUNT и CDEK_SECURE)')
  }
  const base = getCdekApiBase()
  const response = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CDEK auth failed: ${response.status} ${text}`)
  }
  const data = (await response.json()) as CdekAuthResponse
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  }
  return data.access_token
}

/**
 * Расчёт стоимости доставки по списку тарифов (все доступные варианты).
 * Использует endpoint /v2/calculator/tarifflist (список тарифов с ценами).
 */
export async function calculateCdekTariffList(
  request: CdekCalculatorTariffListRequest
): Promise<CdekTariffResult[]> {
  const token = await getCdekToken()
  const body = {
    ...request,
    type: request.type ?? 1,
    currency: request.currency ?? 1,
    lang: request.lang ?? 'rus',
  }
  const base = getCdekApiBase()
  const response = await fetch(`${base}/calculator/tarifflist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CDEK calculator failed: ${response.status} ${text}`)
  }
  const data = (await response.json()) as CdekCalculatorTariffListResponse
  return data.tariffs ?? []
}

// --- Location: список городов ---

/**
 * Список городов СДЭК (Location).
 * GET /v2/location/cities с query-параметрами (API СДЭК возвращает 405 на POST).
 */
export async function getCdekCities(request: CdekCitiesRequest = {}): Promise<CdekCity[]> {
  const token = await getCdekToken()
  const params = new URLSearchParams()
  const countryCodes = request.country_codes ?? ['RU']
  countryCodes.forEach((c) => params.append('country_codes', c))
  if (request.region_code != null) params.set('region_code', String(request.region_code))
  if (request.city) params.set('city', request.city)
  if (request.code != null) params.set('code', String(request.code))
  if (request.postal_code) params.set('postal_code', request.postal_code)
  if (request.fias_guid) params.set('fias_guid', request.fias_guid)
  params.set('size', String(request.size ?? 20))
  params.set('page', String(request.page ?? 0))
  params.set('lang', request.lang ?? 'rus')

  const base = getCdekApiBase()
  const url = `${base}/location/cities?${params.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CDEK location/cities failed: ${response.status} ${text}`)
  }
  const data = (await response.json()) as unknown
  /** СДЭК может вернуть массив в корне, или объект с полем city/cities */
  let rawList: unknown[] = []
  if (Array.isArray(data)) {
    rawList = data
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    rawList = (obj.city as unknown[]) ?? (obj.cities as unknown[]) ?? []
  }
  return rawList.map((item) => normalizeCdekCity(item as Record<string, unknown>))
}

/**
 * Нормализует элемент города из ответа API: СДЭК может вернуть city/code или cityName/cityId.
 */
function normalizeCdekCity(row: Record<string, unknown>): CdekCity {
  const code = row.code ?? row.city_code ?? row.cityId ?? row.city_id
  const city = row.city ?? row.cityName ?? row.name
  const region = row.region ?? row.region_name
  return {
    ...(row as unknown as CdekCity),
    code: code != null ? Number(code) : 0,
    city: city != null ? String(city) : undefined,
    region: region != null ? String(region) : undefined,
  }
}

// --- Delivery point: поиск ПВЗ ---

/**
 * Нормализует пункт выдачи из ответа API: координаты могут быть в location,
 * полный адрес — в location.address_full (подставляем в full_address).
 */
function normalizeCdekDeliveryPoint(raw: Record<string, unknown>): CdekDeliveryPoint {
  const loc = raw.location as Record<string, unknown> | undefined
  const latitude = (
    loc?.latitude ??
    loc?.lat ??
    raw.latitude ??
    raw.lat
  ) as number | undefined
  const longitude = (
    loc?.longitude ??
    loc?.lng ??
    loc?.lon ??
    raw.longitude ??
    raw.lng ??
    raw.lon
  ) as number | undefined
  return {
    ...(raw as CdekDeliveryPoint),
    full_address:
      (raw.full_address as string) ??
      (loc?.address_full as string) ??
      (loc?.address as string) ??
      (raw.address as string),
    location:
      latitude != null && longitude != null
        ? { latitude: Number(latitude), longitude: Number(longitude) }
        : (raw.location as CdekDeliveryPoint['location']),
  }
}

/**
 * Поиск пунктов выдачи (ПВЗ) СДЭК.
 * По документации (apidoc.cdek.ru, delivery_point/operation/search): запрос через POST с телом.
 * При 405/415 делаем fallback на GET с query-параметрами.
 */
export async function searchCdekDeliveryPoints(
  request: CdekDeliveryPointsRequest = {}
): Promise<CdekDeliveryPoint[]> {
  const token = await getCdekToken()
  const filter = request.filter ?? {}
  const size = request.size ?? 20
  const page = request.page ?? 0
  const lang = request.lang ?? 'rus'
  const base = getCdekApiBase()

  /** По документации СДЭК фильтр — плоский объект (city_code, type, size, page, lang и др.) */
  const body: Record<string, unknown> = {
    size,
    page,
    lang,
  }
  if (filter.city_code != null) body.city_code = filter.city_code
  if (filter.postal_code) body.postal_code = filter.postal_code
  if (filter.type) body.type = filter.type
  if (filter.country_code) body.country_code = filter.country_code
  if (filter.region_code != null) body.region_code = filter.region_code
  if (filter.code) body.code = filter.code

  const tryPost = async (): Promise<CdekDeliveryPoint[]> => {
    const response = await fetch(`${base}/deliverypoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`CDEK deliverypoints POST failed: ${response.status} ${text}`)
    }
    const data = (await response.json()) as CdekDeliveryPointsResponse | CdekDeliveryPoint[]
    const list = Array.isArray(data) ? data : (data as CdekDeliveryPointsResponse).delivery_points ?? []
    return list.map((p) => normalizeCdekDeliveryPoint(p as Record<string, unknown>))
  }

  const tryGet = async (): Promise<CdekDeliveryPoint[]> => {
    const params = new URLSearchParams()
    if (filter.city_code != null) params.set('city_code', String(filter.city_code))
    if (filter.postal_code) params.set('postal_code', filter.postal_code)
    if (filter.type) params.set('type', filter.type)
    if (filter.country_code) params.set('country_code', filter.country_code)
    if (filter.region_code != null) params.set('region_code', String(filter.region_code))
    if (filter.code) params.set('code', filter.code)
    params.set('size', String(size))
    params.set('page', String(page))
    params.set('lang', lang)
    const response = await fetch(`${base}/deliverypoints?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`CDEK deliverypoints GET failed: ${response.status} ${text}`)
    }
    const data = (await response.json()) as CdekDeliveryPointsResponse | CdekDeliveryPoint[]
    const list = Array.isArray(data) ? data : (data as CdekDeliveryPointsResponse).delivery_points ?? []
    if (list.length > 0 && typeof list[0] === 'object' && list[0] !== null) {
      const first = list[0] as Record<string, unknown>
      if (
        (first.location as Record<string, unknown> | undefined)?.latitude == null &&
        (first.location as Record<string, unknown> | undefined)?.longitude == null
      ) {
        console.warn('CDEK GET deliverypoints: first point has no location.lat/lon. Keys:', Object.keys(first), 'location:', first.location)
      }
    }
    return list.map((p) => normalizeCdekDeliveryPoint(p as Record<string, unknown>))
  }

  /** СДЭК может поддерживать только GET с query — пробуем GET первым, затем POST */
  try {
    const list = await tryGet()
    if (list.length > 0) return list
  } catch {
    /* ignore, try POST */
  }
  try {
    return await tryPost()
  } catch (postErr) {
    const msg = postErr instanceof Error ? postErr.message : String(postErr)
    if (msg.includes('405') || msg.includes('415') || msg.includes('Method Not Allowed')) {
      return tryGet()
    }
    throw postErr
  }
}

// --- Orders: создание заказа на отгрузку ---

const CDEK_SENDER_KEYS = [
  'cdek_sender_name',
  'cdek_sender_phone',
  'cdek_sender_address',
  'cdek_from_city_code',
] as const

/**
 * Создаёт заказ на отгрузку в СДЭК (POST /v2/orders).
 * Используется после оплаты заказа и при повторе из админки.
 * Формат тела по документации https://apidoc.cdek.ru/#tag/orders
 */
export async function createCdekOrder(orderId: string): Promise<{ uuid: string } | { error: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        shippingInfo: true,
      },
    })
    if (!order || !order.shippingInfo) {
      return { error: 'Заказ или адрес доставки не найден' }
    }
    const sh = order.shippingInfo
    if (sh.deliveryMethod !== 'cdek_pvz' && sh.deliveryMethod !== 'cdek_door') {
      return { error: 'Доставка не СДЭК' }
    }
    if (sh.cdekCityCode == null || sh.cdekTariffCode == null) {
      return { error: 'Не указаны код города или тариф СДЭК' }
    }

    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: [...CDEK_SENDER_KEYS] } },
    })
    const settingsMap: Record<string, string> = {}
    for (const row of settings) {
      settingsMap[row.key] = row.value
    }
    const senderName =
      settingsMap.cdek_sender_name?.trim() || process.env.CDEK_SENDER_NAME?.trim() || 'Отправитель'
    const senderPhone =
      settingsMap.cdek_sender_phone?.trim() || process.env.CDEK_SENDER_PHONE?.trim() || ''
    const senderAddress =
      settingsMap.cdek_sender_address?.trim() || process.env.CDEK_SENDER_ADDRESS?.trim() || ''
    const fromCityCode =
      settingsMap.cdek_from_city_code?.trim() || process.env.CDEK_FROM_CITY_CODE?.trim() || ''
    const fromCode = fromCityCode ? Number(fromCityCode) : undefined
    if (fromCode == null || Number.isNaN(fromCode)) {
      return { error: 'Не задан код города отправления СДЭК (настройки или CDEK_FROM_CITY_CODE)' }
    }

    const packages = mergeCdekPackages(
      order.items.map((item) =>
        productToCdekPackage(
          item.product.weight,
          item.product.length,
          item.product.width,
          item.product.height,
          item.quantity
        )
      )
    )

    const packageItems = order.items.map((item) => ({
      name: item.product.title?.slice(0, 255) || 'Товар',
      ware_key: item.productId,
      cost: item.price,
      amount: item.quantity,
      weight: Math.max(1, Math.round((item.product.weight ?? DEFAULT_PACKAGE_WEIGHT_G) * item.quantity)),
      payment: { value: 0 },
    }))

    const from_location = { code: fromCode, country_code: 'RU' as const }
    let to_location: Record<string, unknown>
    if (sh.deliveryMethod === 'cdek_pvz' && sh.cdekPvzCode) {
      to_location = { code: sh.cdekCityCode, country_code: 'RU' as const, delivery_point: sh.cdekPvzCode }
    } else {
      to_location = { code: sh.cdekCityCode, country_code: 'RU' as const }
      if (sh.deliveryMethod === 'cdek_door' && (sh.street || sh.house)) {
        to_location.address = [sh.street, sh.house, sh.apartment, sh.entrance, sh.floor, sh.intercom]
          .filter(Boolean)
          .join(', ')
      }
    }

    const body = {
      type: 1,
      tariff_code: sh.cdekTariffCode,
      number: orderId,
      from_location,
      to_location,
      recipient: {
        name: sh.fullName,
        phones: [{ number: sh.phone }],
        ...(sh.email ? { email: sh.email } : {}),
      },
      sender: {
        name: senderName,
        ...(senderPhone ? { phones: [{ number: senderPhone }] } : {}),
        ...(senderAddress ? { address: senderAddress } : {}),
      },
      packages: packages.map((pkg, idx) => ({
        number: String(idx + 1),
        weight: pkg.weight,
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        items: packageItems,
      })),
    }

    const token = await getCdekToken()
    const base = getCdekApiBase()
    const response = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) {
      console.error('[CDEK createOrder]', orderId, response.status, text)
      return { error: `СДЭК: ${response.status} ${text.slice(0, 200)}` }
    }
    let data: { entity?: { uuid?: string }; uuid?: string }
    try {
      data = JSON.parse(text) as { entity?: { uuid?: string }; uuid?: string }
    } catch {
      return { error: `СДЭК: неверный ответ ${text.slice(0, 100)}` }
    }
    const uuid = data.entity?.uuid ?? data.uuid
    if (!uuid) {
      return { error: `СДЭК: в ответе нет uuid. ${text.slice(0, 200)}` }
    }
    return { uuid }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[CDEK createOrder]', orderId, e)
    return { error: message }
  }
}
