/**
 * Интеграция с API СДЭК (https://apidoc.cdek.ru).
 * Учётные данные OAuth: из настроек админки (cdek_api_key + cdek_client_secret) или из env.
 * Реализовано по разделам документации:
 * - Auth: getOAuthToken (https://apidoc.cdek.ru/#tag/auth/operation/getOAuthToken)
 * - Location: города (https://apidoc.cdek.ru/#tag/location)
 * - Delivery point: поиск ПВЗ (https://apidoc.cdek.ru/#tag/delivery_point/operation/search)
 * - Calculator: расчёт тарифов (https://apidoc.cdek.ru/#tag/calculator)
 * - Orders: создание заказа на отгрузку (https://apidoc.cdek.ru/#tag/orders)
 *
 * Тестовое окружение: CDEK_USE_TEST=true или CDEK_API_BASE=https://api.edu.cdek.ru/v2
 */

import type { BrandId } from '@/lib/brand/brand'

const CDEK_API_PRODUCTION = 'https://api.cdek.ru/v2'
const CDEK_API_TEST = 'https://api.edu.cdek.ru/v2'
const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const CDEK_TRACK_SYNC_BATCH_LIMIT = 5

function getCdekApiBase(creds?: { useTest?: boolean } | null): string {
  if (creds?.useTest === true) return CDEK_API_TEST
  return CDEK_API_PRODUCTION
}

function isCdekTestBase(base: string): boolean {
  return base.includes('api.edu.cdek.ru')
}

function getCdekTrackSyncIntervalMs(createdAt: Date, now = new Date()): number | null {
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime())
  if (ageMs <= 6 * HOUR_MS) return 15 * MINUTE_MS
  if (ageMs <= DAY_MS) return HOUR_MS
  if (ageMs <= 7 * DAY_MS) return 6 * HOUR_MS
  if (ageMs <= 30 * DAY_MS) return DAY_MS
  return null
}

function parseTrackNumberFromCdekOrderPayload(data: {
  entity?: { cdek_number?: string; track_number?: string }
  cdek_number?: string
  track_number?: string
}): string | null {
  const raw =
    data.entity?.cdek_number ?? data.entity?.track_number ?? data.cdek_number ?? data.track_number
  const trackNumber = raw?.trim()
  return trackNumber ? trackNumber : null
}

export function extractCdekPvzCodeFromAddress(address: string | null | undefined): string | null {
  const normalized = address?.trim()
  if (!normalized) return null
  const match = normalized.match(/СДЭК\s+ПВЗ\s+([A-Za-zА-Яа-я0-9-]+)\s*:/i)
  const code = match?.[1]?.trim().toUpperCase()
  return code ? code : null
}

export function buildCdekDoorAddress(input: {
  address?: string | null
  street?: string | null
  house?: string | null
  apartment?: string | null
  entrance?: string | null
  floor?: string | null
  intercom?: string | null
}): string | null {
  const structured = [
    input.street?.trim(),
    input.house?.trim(),
    input.apartment?.trim(),
    input.entrance?.trim(),
    input.floor?.trim(),
    input.intercom?.trim(),
  ]
    .filter(Boolean)
    .join(', ')
    .trim()
  if (structured) return structured

  const fallback = input.address?.split('\n')[0]?.trim()
  if (!fallback) return null
  if (fallback.split(',').map((part) => part.trim()).filter(Boolean).length < 3) return null
  return fallback
}

export function buildCdekPvzAddress(address: string | null | undefined): string | null {
  const fallback = address?.split('\n')[0]?.trim()
  if (!fallback) return null

  const exactPvzAddress = fallback.match(
    /СДЭК\s+ПВЗ\s+[A-Za-zА-Яа-я0-9-]+\s*:\s*(.+)$/i
  )?.[1]?.trim()

  if (exactPvzAddress) return exactPvzAddress
  return fallback
}

function buildCdekWareKey(input: {
  sku?: string | null
  title?: string | null
}): string {
  const sku = input.sku?.trim()
  if (sku) return sku

  const title = input.title?.trim()
  if (title) return title

  return 'Товар'
}

/** Локация для расчёта: код города СДЭК или почтовый индекс */
export interface CdekLocation {
  /** Код населённого пункта СДЭК (приоритет) */
  code?: number
  /** Код населённого пункта СДЭК (альтернативное имя поля в некоторых endpoint'ах) */
  city_code?: number
  /** UUID города/населённого пункта СДЭК, когда он известен. */
  city_uuid?: string
  /** Почтовый индекс (если нет code) */
  postal_code?: string
  /** Адрес получателя/отправителя внутри выбранного населённого пункта. */
  address?: string
  /** Код страны ISO 3166-1 alpha-2 */
  country_code?: string
  /** Код ПВЗ (если нужно считать от конкретного ПВЗ) */
  delivery_point?: string
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
  /** Ограничение списка тарифов (если endpoint ожидает явный набор). */
  tariff_codes?: number[]
  /** Дополнительные услуги (часто требуется как массив, даже если пустой). */
  services?: Array<Record<string, unknown>>
  /** Дополнительные типы заказа для проб/совместимости с интеграциями. */
  additional_order_types?: number[]
  /**
   * Дата/время передачи заказа.
   * В разных контурах CDEK ожидает либо строку, либо timestamp числом.
   */
  date?: string | number
  lang?: 'rus' | 'eng'
}

/** Элемент ответа калькулятора (тариф с ценой и сроками) */
export interface CdekTariffResult {
  tariff_code: number
  tariff_name?: string
  tariff_description?: string
  delivery_mode?: number
  delivery_sum: number
  period_min: number
  period_max: number
  calendar_min?: number
  calendar_max?: number
}

const CDEK_WIDGET_TARIFF_METADATA: Record<number, { tariff_name: string; delivery_mode: number }> = {
  136: {
    tariff_name: 'Посылка склад-склад',
    delivery_mode: 4,
  },
  137: {
    tariff_name: 'Посылка склад-дверь',
    delivery_mode: 3,
  },
}

function enrichTariffResult(result: Partial<CdekTariffResult>, tariffCode: number): CdekTariffResult {
  const metadata = CDEK_WIDGET_TARIFF_METADATA[tariffCode]
  return {
    ...result,
    tariff_code: result.tariff_code ?? tariffCode,
    tariff_name: result.tariff_name ?? metadata?.tariff_name,
    delivery_mode: result.delivery_mode ?? metadata?.delivery_mode,
  } as CdekTariffResult
}

/**
 * Тип доставки СДЭК для фильтрации тарифов.
 * До ПВЗ — в пункт выдачи (склад-склад).
 * До адреса — курьером до двери (склад-дверь / дверь-дверь).
 */
export type CdekDeliveryKind = 'pvz' | 'address'

/** Коды тарифов СДЭК: до ПВЗ (пункт выдачи) */
export const CDEK_TARIFF_CODES_PVZ = [
  // Посылка / экономичная / склад-постамат
  136, // склад-склад (склад = пункт выдачи/склад получателя)
  138, // дверь-склад
  232, // экономичная дверь-склад
  234, // экономичная склад-склад
  366, // дверь-постамат
  368, // склад-постамат
  378, // экономичная склад-постамат

  // Documents Express
  2262, // дверь-склад
  2264, // склад-склад
  2266, // дверь-постамат
  2267, // склад-постамат

  // Экспресс
  481, // дверь-склад
  483, // склад-склад
  485, // дверь-постамат
  486, // склад-постамат

  // Супер-экспресс (до N: дверь-склад / склад-склад)
  777, // дверь-склад
  786, // дверь-склад
  679, // склад-склад
  689,
  699,
  709,
  719,
  779,
  788,
  797,
  806,

  // Супер-экспресс (до N: дверь-склад)
  677,
  687,
  697,
  707,

  // Магистральный
  62, // склад-склад
  123, // дверь-склад
  63, // дверь-склад
  126, // дверь-склад
]
/** Коды тарифов СДЭК: до адреса (курьером до двери) */
export const CDEK_TARIFF_CODES_ADDRESS = [
  // Посылка / экономичная
  137, // склад-дверь
  139, // дверь-дверь
  231, // экономичная дверь-дверь
  233, // экономичная склад-дверь

  // Documents Express
  2261, // дверь-дверь
  2263, // склад-дверь

  // Экспресс
  480, // дверь-дверь
  482, // склад-дверь

  // Супер-экспресс (до N: дверь-дверь)
  57, 58, 59, 60, 61,
  3,

  // Супер-экспресс (до N: склад-дверь)
  717,
  678,
  688,
  698,
  708,
  718,
  778,
  787,
  796,
  805,

  // Супер-экспресс (до N: дверь-дверь)
  676,
  686,
  696,
  706,
  716,

  // Магистральный
  121, // дверь-дверь
  122, // склад-дверь
  124, // дверь-дверь (супер)
  125, // склад-дверь (супер)
]

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

export interface CdekPackageDefaults {
  weightG: number
  lengthMm: number
  widthMm: number
  heightMm: number
}

const DEFAULT_PACKAGE_DEFAULTS: CdekPackageDefaults = {
  weightG: 100,
  lengthMm: 33,
  widthMm: 25,
  heightMm: 15,
}

const ORDER_REGISTRATION_FALLBACK_DIMENSION = 1

/**
 * Минимальные габариты для одного пакета (если у товара не указаны).
 * СДЭК принимает целые числа; вес в г, размеры в мм.
 */
export function getDefaultCdekPackage(): CdekPackage {
  return {
    weight: DEFAULT_PACKAGE_DEFAULTS.weightG,
    length: DEFAULT_PACKAGE_DEFAULTS.lengthMm,
    width: DEFAULT_PACKAGE_DEFAULTS.widthMm,
    height: DEFAULT_PACKAGE_DEFAULTS.heightMm,
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
  quantity: number,
  defaults: CdekPackageDefaults = DEFAULT_PACKAGE_DEFAULTS
): CdekPackage {
  // CDEK ожидает положительные целые значения. Некоторые данные в админке
  // могут приходить как `0` вместо `null` — тогда мы подставляем дефолты.
  const safePositiveOrDefault = (value: number | null | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

  const w = safePositiveOrDefault(weightG, defaults.weightG) * quantity
  const l = safePositiveOrDefault(lengthMm, defaults.lengthMm)
  const wd = safePositiveOrDefault(widthMm, defaults.widthMm)
  const h = safePositiveOrDefault(heightMm, defaults.heightMm)
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

function buildSafePackagesForCdekOrderRegistration(packages: CdekPackage[]): CdekPackage[] {
  return packages.map((pkg) => ({
    weight: pkg.weight,
    // Для регистрации отгрузки используем безопасные габариты 1x1x1.
    // Расчёт в виджете уже выполняется отдельно, а здесь важнее не сломать
    // создание заказа в CDEK из-за слишком грубых/неточных размеров товара.
    length: ORDER_REGISTRATION_FALLBACK_DIMENSION,
    width: ORDER_REGISTRATION_FALLBACK_DIMENSION,
    height: ORDER_REGISTRATION_FALLBACK_DIMENSION,
  }))
}

let cachedToken: {
  key: string
  token: string
  expiresAt: number
} | null = null

export interface CdekCredentials {
  clientId: string
  clientSecret: string
  useTest: boolean
}

/**
 * Получает OAuth-токен СДЭК (getOAuthToken, кэшируется до истечения).
 * Учётные данные: из override, иначе из настроек админки или env (настройки перекрывают env).
 */
export async function getCdekToken(
  override?: CdekCredentials | null
): Promise<string> {
  const { getCdekCredentials } = await import('@/services/settings.service')
  const creds = override ?? (await getCdekCredentials())
  if (!creds?.clientId || !creds.clientSecret) {
    throw new Error(
      'CDEK: задайте учётные данные в настройках (API-ключ и секрет) в админке'
    )
  }
  const now = Date.now()
  const base = getCdekApiBase(creds)
  const cacheKey = `${base}|${creds.clientId}`
  if (
    cachedToken &&
    cachedToken.key === cacheKey &&
    cachedToken.expiresAt > now + 60_000
  ) {
    return cachedToken.token
  }
  const response = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CDEK auth failed: ${response.status} ${text}`)
  }
  const data = (await response.json()) as CdekAuthResponse
  cachedToken = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  }
  return data.access_token
}

/** Результат проверки подключения к API СДЭК. */
export interface CdekConnectionCheck {
  ok: boolean
  error?: string
}

type CdekCalculatorTariffResponse = CdekTariffResult

function isCdekInternalError(text: string): boolean {
  return text.includes('"code":"v2_internal_error"') || text.includes('v2_internal_error')
}

async function getCdekTokenForBase(params: {
  base: string
  overrideCredentials?: CdekCredentials | null
}): Promise<string> {
  const { base, overrideCredentials } = params
  const { getCdekCredentials } = await import('@/services/settings.service')
  const creds = overrideCredentials ?? (await getCdekCredentials())
  if (!creds?.clientId || !creds.clientSecret) {
    throw new Error(
      'CDEK: задайте учётные данные в настройках (API-ключ и секрет) в админке'
    )
  }
  const now = Date.now()
  const cacheKey = `${base}|${creds.clientId}`
  if (cachedToken && cachedToken.key === cacheKey && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }
  const response = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`CDEK auth failed: ${response.status} ${text}`)
  }
  const data = (await response.json()) as CdekAuthResponse
  cachedToken = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  }
  return data.access_token
}

async function calculateCdekTariff(
  request: CdekCalculatorTariffRequest,
  overrideCredentials?: CdekCredentials | null
): Promise<CdekCalculatorTariffResponse> {
  const run = async (base: string): Promise<CdekCalculatorTariffResponse> => {
    const token = await getCdekTokenForBase({ base, overrideCredentials })
    const response = await fetch(`${base}/calculator/tariff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...request,
        type: request.type ?? 1,
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`CDEK calculator/tariff failed: ${response.status} ${text}`)
    }
    const data = (await response.json()) as unknown
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as { errors?: unknown }).errors) &&
      (data as { errors: unknown[] }).errors.length > 0
    ) {
      const errors = (data as { errors: Array<{ code?: unknown; message?: unknown; additional_code?: unknown }> }).errors
      const compact = errors
        .slice(0, 5)
        .map((e) => {
          const code = typeof e.code === 'string' ? e.code : ''
          const add = typeof e.additional_code === 'string' ? ` (${e.additional_code})` : ''
          const msg = typeof e.message === 'string' ? e.message : ''
          return [code ? `${code}${add}` : null, msg || null].filter(Boolean).join(': ')
        })
        .filter((s) => s.length > 0)
        .join('; ')
      throw new Error(`CDEK calculator tariff error: ${compact || 'unknown'}`)
    }
    const parsed = data as Partial<CdekCalculatorTariffResponse>
    return enrichTariffResult(parsed, request.tariff_code) as CdekCalculatorTariffResponse
  }

  const base = getCdekApiBase(overrideCredentials ?? null)
  try {
    return await run(base)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (isCdekTestBase(base) && isCdekInternalError(msg)) {
      console.warn('[cdek/calc][tariff] retry against production due to test internal error')
      try {
        return await run(CDEK_API_PRODUCTION)
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : String(e2)
        console.warn('[cdek/calc][tariff] production retry failed; keep original error', msg2)
        throw e
      }
    }
    throw e
  }
}

/**
 * Проверяет подключение к API СДЭК: получает OAuth-токен.
 * Учётные данные: из override, иначе из настроек админки или env (настройки перекрывают env).
 */
export async function checkCdekConnection(
  override?: CdekCredentials | null
): Promise<CdekConnectionCheck> {
  try {
    await getCdekToken(override)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

/**
 * Расчёт стоимости доставки по списку тарифов (все доступные варианты).
 * Использует endpoint /v2/calculator/tarifflist (список тарифов с ценами).
 */
export async function calculateCdekTariffList(
  request: CdekCalculatorTariffListRequest,
  overrideCredentials?: CdekCredentials | null
): Promise<CdekTariffResult[]> {
  const run = async (base: string): Promise<CdekTariffResult[]> => {
    const token = await getCdekTokenForBase({ base, overrideCredentials })
    const body = {
      ...request,
      type: request.type ?? 1,
      currency: request.currency ?? 1,
      lang: request.lang ?? 'rus',
    }
    // Debug: helps distinguish "request contract" issues from "test/prod instability".
    // Do not log secrets (token), only request parameters.
    console.warn('[cdek/calc][tarifflist] request', {
      base,
      from_location: body.from_location,
      to_location: body.to_location,
      type: body.type,
      currency: body.currency,
      lang: body.lang,
      date: body.date,
      servicesCount: body.services?.length ?? 0,
      packagesCount: body.packages?.length ?? 0,
      packages: body.packages,
      tariff_codes: body.tariff_codes,
    })
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
      // In practice (especially in edu contour) tarifflist can intermittently return v2_internal_error.
      // Fallback: calculate each requested tariff via /calculator/tariff.
      if (isCdekInternalError(text) && Array.isArray(request.tariff_codes) && request.tariff_codes.length > 0) {
        const results: CdekTariffResult[] = []
        for (const tariffCode of request.tariff_codes) {
          try {
            const one = await calculateCdekTariff(
              {
                tariff_code: tariffCode,
                from_location: request.from_location ?? { country_code: 'RU' },
                to_location: request.to_location,
                packages: request.packages,
                type: request.type,
              },
              overrideCredentials
            )
            results.push(one)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            console.warn('[cdek/calc][tariff] fallback failed for tariff_code', tariffCode, msg)
          }
        }
        if (results.length > 0) return results
      }
      throw new Error(`CDEK calculator failed: ${response.status} ${text}`)
    }
    const data = (await response.json()) as unknown
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as { errors?: unknown }).errors) &&
      (data as { errors: unknown[] }).errors.length > 0
    ) {
      const errors = (data as { errors: Array<{ code?: unknown; message?: unknown; additional_code?: unknown }> }).errors
      const compact = errors
        .slice(0, 5)
        .map((e) => {
          const code = typeof e.code === 'string' ? e.code : ''
          const add = typeof e.additional_code === 'string' ? ` (${e.additional_code})` : ''
          const msg = typeof e.message === 'string' ? e.message : ''
          return [code ? `${code}${add}` : null, msg || null].filter(Boolean).join(': ')
        })
        .filter((s) => s.length > 0)
        .join('; ')
      throw new Error(`CDEK calculator tarifflist error: ${compact || 'unknown'}`)
    }
    const parsed = data as Partial<CdekCalculatorTariffListResponse>
    const tariffs = Array.isArray(parsed.tariffs) ? parsed.tariffs : []

    // Some accounts / contours occasionally return 200 OK with empty `tariffs`.
    // Fallback: calculate each requested tariff via /calculator/tariff.
    if (tariffs.length === 0 && Array.isArray(request.tariff_codes) && request.tariff_codes.length > 0) {
      console.warn('[cdek/calc][tarifflist] empty tariffs; fallback to /calculator/tariff', {
        tariffCodesCount: request.tariff_codes.length,
        firstTariffCodes: request.tariff_codes.slice(0, 5),
      })
      const results: CdekTariffResult[] = []
      const errors: string[] = []
      for (const tariffCode of request.tariff_codes) {
        try {
          const one = await calculateCdekTariff(
            {
              tariff_code: tariffCode,
              from_location: request.from_location ?? { country_code: 'RU' },
              to_location: request.to_location,
              packages: request.packages,
              type: request.type,
            },
            overrideCredentials
          )
          results.push(one)
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          errors.push(`${tariffCode}: ${msg}`)
          console.warn('[cdek/calc][tariff] empty-tarifflist fallback failed for tariff_code', tariffCode, msg)
        }
      }
      if (results.length > 0) return results
      if (errors.length > 0) {
        throw new Error(
          `CDEK calculator returned empty tariffs; /calculator/tariff also failed: ${errors.slice(0, 3).join('; ')}`
        )
      }
    }

    return tariffs
  }

  const base = getCdekApiBase(overrideCredentials ?? null)
  try {
    return await run(base)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (isCdekTestBase(base) && isCdekInternalError(msg)) {
      console.warn('[cdek/calc][tarifflist] retry against production due to test internal error')
      try {
        return await run(CDEK_API_PRODUCTION)
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : String(e2)
        console.warn('[cdek/calc][tarifflist] production retry failed; keep original error', msg2)
        throw e
      }
    }
    throw e
  }
}

// --- Location: список городов ---

/**
 * Список городов СДЭК (Location).
 * GET /v2/location/cities с query-параметрами (API СДЭК возвращает 405 на POST).
 */
export async function getCdekCities(
  request: CdekCitiesRequest = {},
  overrideCredentials?: CdekCredentials | null
): Promise<CdekCity[]> {
  const token = await getCdekToken(overrideCredentials)
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

  const base = getCdekApiBase(overrideCredentials ?? null)
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
  const cityCodeRaw =
    raw.city_code ??
    loc?.city_code ??
    raw.cityCode ??
    loc?.cityCode ??
    raw.city_id ??
    loc?.city_id ??
    raw.cityId ??
    loc?.cityId
  const normalizedCityCode =
    cityCodeRaw != null && !Number.isNaN(Number(cityCodeRaw)) ? Number(cityCodeRaw) : undefined
  const rawCode =
    raw.code ??
    raw.delivery_point ??
    raw.deliveryPoint ??
    raw.delivery_point_code ??
    raw.deliveryPointCode ??
    loc?.code ??
    loc?.delivery_point ??
    loc?.deliveryPoint
  const normalizedCode = rawCode != null ? String(rawCode) : undefined

  const rawPostalCode =
    raw.postal_code ??
    raw.postalCode ??
    raw.zip_code ??
    raw.zipCode ??
    loc?.postal_code ??
    loc?.postalCode ??
    loc?.zip_code ??
    loc?.zipCode
  const normalizedPostalCode =
    rawPostalCode != null && String(rawPostalCode).trim() !== ''
      ? String(rawPostalCode).trim()
      : undefined

  const rawCityName =
    raw.city ??
    raw.city_name ??
    raw.cityName ??
    raw.locality ??
    raw.locality_name ??
    loc?.city ??
    loc?.city_name ??
    loc?.cityName ??
    loc?.locality ??
    loc?.locality_name
  const normalizedCityName =
    rawCityName != null && String(rawCityName).trim() !== '' ? String(rawCityName).trim() : undefined
  const normalizedLocation: Record<string, unknown> = {
    ...(loc ?? {}),
  }
  if (latitude != null) normalizedLocation.latitude = Number(latitude)
  if (longitude != null) normalizedLocation.longitude = Number(longitude)
  if (normalizedCityCode != null) normalizedLocation.city_code = normalizedCityCode
  if (normalizedPostalCode) normalizedLocation.postal_code = normalizedPostalCode
  return {
    ...(raw as CdekDeliveryPoint),
    ...(normalizedCode ? { code: normalizedCode } : {}),
    ...(normalizedCityCode != null ? { city_code: normalizedCityCode } : {}),
    ...(normalizedPostalCode ? { postal_code: normalizedPostalCode } : {}),
    ...(normalizedCityName ? { city: normalizedCityName } : {}),
    full_address:
      (raw.full_address as string) ??
      (loc?.address_full as string) ??
      (loc?.address as string) ??
      (raw.address as string),
    location: normalizedLocation as CdekDeliveryPoint['location'],
  }
}

/**
 * Поиск пунктов выдачи (ПВЗ) СДЭК.
 * По документации (apidoc.cdek.ru, delivery_point/operation/search): запрос через POST с телом.
 * При 405/415 делаем fallback на GET с query-параметрами.
 */
export async function searchCdekDeliveryPoints(
  request: CdekDeliveryPointsRequest = {},
  overrideCredentials?: CdekCredentials | null
): Promise<CdekDeliveryPoint[]> {
  const token = await getCdekToken(overrideCredentials)
  const filter = request.filter ?? {}
  const size = request.size ?? 20
  const page = request.page ?? 0
  const lang = request.lang ?? 'rus'
  const base = getCdekApiBase(overrideCredentials ?? null)

  type CodeMode = 'code' | 'delivery_point'

  /** По документации СДЭК фильтр — плоский объект (city_code, type, size, page, lang и др.). */
  const buildPostBody = (mode: CodeMode): Record<string, unknown> => {
    const next: Record<string, unknown> = {
      size,
      page,
      lang,
    }
    if (filter.city_code != null) next.city_code = filter.city_code
    if (filter.postal_code) next.postal_code = filter.postal_code
    if (filter.type) next.type = filter.type
    if (filter.country_code) next.country_code = filter.country_code
    if (filter.region_code != null) next.region_code = filter.region_code
    if (filter.code) next[mode === 'code' ? 'code' : 'delivery_point'] = filter.code
    return next
  }

  const tryPost = async (mode: CodeMode): Promise<CdekDeliveryPoint[]> => {
    const body = buildPostBody(mode)
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

  const tryGet = async (mode: CodeMode): Promise<CdekDeliveryPoint[]> => {
    const params = new URLSearchParams()
    if (filter.city_code != null) params.set('city_code', String(filter.city_code))
    if (filter.postal_code) params.set('postal_code', filter.postal_code)
    if (filter.type) params.set('type', filter.type)
    if (filter.country_code) params.set('country_code', filter.country_code)
    if (filter.region_code != null) params.set('region_code', String(filter.region_code))
    if (filter.code) params.set(mode === 'code' ? 'code' : 'delivery_point', filter.code)
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
    const list = await tryGet('code')
    if (list.length > 0) return list
  } catch {
    /* ignore, try POST */
  }
  try {
    const list = await tryGet('delivery_point')
    if (list.length > 0) return list
  } catch {
    /* ignore, try POST */
  }

  try {
    const list = await tryPost('code')
    if (list.length > 0) return list
    return list
  } catch (postErr) {
    const msg = postErr instanceof Error ? postErr.message : String(postErr)
    if (msg.includes('405') || msg.includes('415') || msg.includes('Method Not Allowed')) {
      // Пытаемся GET с тем же режимом
      const list = await tryGet('code')
      if (list.length > 0) return list
    }
    // Если POST с `code` не сработал — пробуем альтернативный ключ
  }

  // Финальная попытка: POST/GET с `delivery_point`
  try {
    const list = await tryPost('delivery_point')
    if (list.length > 0) return list
    return list
  } catch (postErr) {
    const msg = postErr instanceof Error ? postErr.message : String(postErr)
    if (msg.includes('405') || msg.includes('415') || msg.includes('Method Not Allowed')) {
      const list = await tryGet('delivery_point')
      return list
    }
    throw postErr
  }
}

// --- Orders: создание заказа на отгрузку ---

const CDEK_SENDER_KEYS = [
  'cdek_sender_name',
  'cdek_sender_phone',
  'cdek_sender_address',
  'cdek_from_pvz_code',
  'cdek_from_city_code',
  'cdek_default_package_weight_g',
  'cdek_default_package_length_mm',
  'cdek_default_package_width_mm',
  'cdek_default_package_height_mm',
] as const

type CdekSenderScope = 'brand' | 'global'

type CdekSenderSettingsMap = Record<(typeof CDEK_SENDER_KEYS)[number], string>

type NormalizedCdekSenderSettings = {
  senderName: string
  senderPhone: string
  senderAddress: string
  fromPvzCode: string
  fromCityCodeRaw: string
}

export interface ResolvedCdekSenderSettings {
  fromPvzCode: string
  fromCityCode: number
  senderAddress: string
  senderName: string
  senderPhone: string
  scopeUsed: CdekSenderScope
  fromPostalCode: string | null
  calculatorFromLocation: CdekLocation
}

export type ResolveCdekSenderSettingsResult =
  | { ok: true; settings: ResolvedCdekSenderSettings }
  | { ok: false; error: string }

function normalizeCdekSenderSettingsMap(
  settings: Partial<CdekSenderSettingsMap>
): NormalizedCdekSenderSettings {
  return {
    senderName: settings.cdek_sender_name?.trim() ?? '',
    senderPhone: settings.cdek_sender_phone?.trim() ?? '',
    senderAddress: settings.cdek_sender_address?.trim() ?? '',
    fromPvzCode: settings.cdek_from_pvz_code?.trim().toUpperCase() ?? '',
    fromCityCodeRaw: settings.cdek_from_city_code?.trim() ?? '',
  }
}

function hasRequiredCdekSenderSettings(settings: NormalizedCdekSenderSettings): boolean {
  return Boolean(settings.senderAddress && settings.fromPvzCode && settings.fromCityCodeRaw)
}

function parseCdekSenderCityCode(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function findCdekDeliveryPointByCode(
  code: string,
  creds?: CdekCredentials | null
): Promise<CdekDeliveryPoint | null> {
  const first = await searchCdekDeliveryPoints({ filter: { code }, size: 1 }, creds)
  if (first.length > 0) return first[0] ?? null

  const second = await searchCdekDeliveryPoints(
    { filter: { code, type: 'PVZ' }, size: 1 },
    creds
  )
  if (second.length > 0) return second[0] ?? null

  const third = await searchCdekDeliveryPoints(
    { filter: { code, type: 'ALL' }, size: 1 },
    creds
  )
  return third[0] ?? null
}

export async function resolveCdekSenderSettings(params: {
  brandId?: BrandId | null
  overrideCredentials?: CdekCredentials | null
  validatePvzCity?: boolean
} = {}): Promise<ResolveCdekSenderSettingsResult> {
  const { brandId = null, overrideCredentials = null, validatePvzCity = true } = params
  const settingsService = await import('@/services/settings.service')

  const brandSettings = brandId
    ? normalizeCdekSenderSettingsMap(
        (await settingsService.getSettingsMap([...CDEK_SENDER_KEYS], {
          brandId,
        })) as Partial<CdekSenderSettingsMap>
      )
    : null

  const globalSettings = normalizeCdekSenderSettingsMap(
    (await settingsService.getSettingsMap([...CDEK_SENDER_KEYS], {})) as Partial<CdekSenderSettingsMap>
  )

  const selectedScope: CdekSenderScope =
    brandSettings && hasRequiredCdekSenderSettings(brandSettings) ? 'brand' : 'global'
  const selectedSettings = selectedScope === 'brand' && brandSettings ? brandSettings : globalSettings

  if (!selectedSettings.fromPvzCode) {
    return { ok: false, error: 'Не задан код ПВЗ отправки СДЭК (cdek_from_pvz_code)' }
  }

  if (!selectedSettings.fromCityCodeRaw) {
    return { ok: false, error: 'Не задан код города отправления СДЭК (cdek_from_city_code)' }
  }

  const fromCityCode = parseCdekSenderCityCode(selectedSettings.fromCityCodeRaw)
  if (fromCityCode == null) {
    return {
      ok: false,
      error: `Некорректный код города отправления СДЭК: ${selectedSettings.fromCityCodeRaw}`,
    }
  }

  if (!selectedSettings.senderAddress) {
    return { ok: false, error: 'Не задан адрес отправителя СДЭК (cdek_sender_address)' }
  }

  if (validatePvzCity) {
    const senderPoint = await findCdekDeliveryPointByCode(selectedSettings.fromPvzCode, overrideCredentials)
    if (!senderPoint) {
      return { ok: false, error: `Не найден ПВЗ отправки СДЭК: ${selectedSettings.fromPvzCode}` }
    }

    const pointCityCode = senderPoint.city_code
    if (
      pointCityCode != null &&
      Number.isFinite(pointCityCode) &&
      pointCityCode > 0 &&
      pointCityCode !== fromCityCode
    ) {
      console.error('[cdek/sender] from_pvz_code city mismatch', {
        brandId,
        scopeUsed: selectedScope,
        fromPvzCode: selectedSettings.fromPvzCode,
        fromCityCode,
        pointCityCode,
      })
      return {
        ok: false,
        error: `Код города отправления СДЭК (${fromCityCode}) не соответствует ПВЗ отправки ${selectedSettings.fromPvzCode} (город ${pointCityCode})`,
      }
    }
  }

  const senderName =
    selectedSettings.senderName || process.env.CDEK_SENDER_NAME?.trim() || 'Отправитель'
  const senderPhone = selectedSettings.senderPhone || process.env.CDEK_SENDER_PHONE?.trim() || ''
  const fromPostalCode = selectedSettings.senderAddress.match(/\b\d{6}\b/)?.[0] ?? null

  return {
    ok: true,
    settings: {
      fromPvzCode: selectedSettings.fromPvzCode,
      fromCityCode,
      senderAddress: selectedSettings.senderAddress,
      senderName,
      senderPhone,
      scopeUsed: selectedScope,
      fromPostalCode,
      calculatorFromLocation: {
        code: fromCityCode,
        country_code: 'RU',
      },
    },
  }
}

/**
 * Создаёт заказ на отгрузку в СДЭК (POST /v2/orders).
 * Используется после оплаты заказа и при повторе из админки.
 * Формат тела по документации https://apidoc.cdek.ru/#tag/orders
 */
export async function createCdekOrder(
  orderId: string
): Promise<{ uuid: string; trackNumber?: string } | { error: string }> {
  try {
    const orderService = await import('@/services/order.service')
    const settingsService = await import('@/services/settings.service')
    const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)
    const scopedCredentials = await settingsService.getCdekCredentials({
      brandId: orderBrandId,
    })
    const order = await orderService.findOrderWithItemsAndShippingForCdek(orderId)
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

    const senderSettingsResult = await resolveCdekSenderSettings({
      brandId: orderBrandId,
      overrideCredentials: scopedCredentials,
      validatePvzCity: true,
    })
    if (!senderSettingsResult.ok) {
      const errorMessage =
        'error' in senderSettingsResult ? senderSettingsResult.error : 'CDEK sender settings error'
      return { error: errorMessage }
    }
    const senderSettings = senderSettingsResult.settings

    const settingsMap = await settingsService.getSettingsMap([...CDEK_SENDER_KEYS], {
      brandId: orderBrandId,
    })

    const parsePositiveIntOrNull = (raw: string | undefined): number | null => {
      const trimmed = raw?.trim()
      if (!trimmed) return null
      const parsed = Number.parseInt(trimmed, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    }

    const brandDefaults = {
      weightG: parsePositiveIntOrNull(settingsMap.cdek_default_package_weight_g),
      lengthMm: parsePositiveIntOrNull(settingsMap.cdek_default_package_length_mm),
      widthMm: parsePositiveIntOrNull(settingsMap.cdek_default_package_width_mm),
      heightMm: parsePositiveIntOrNull(settingsMap.cdek_default_package_height_mm),
    }

    const needsGlobalDefaults =
      brandDefaults.weightG == null ||
      brandDefaults.lengthMm == null ||
      brandDefaults.widthMm == null ||
      brandDefaults.heightMm == null

    let packageDefaults: CdekPackageDefaults = {
      weightG: brandDefaults.weightG ?? DEFAULT_PACKAGE_DEFAULTS.weightG,
      lengthMm: brandDefaults.lengthMm ?? DEFAULT_PACKAGE_DEFAULTS.lengthMm,
      widthMm: brandDefaults.widthMm ?? DEFAULT_PACKAGE_DEFAULTS.widthMm,
      heightMm: brandDefaults.heightMm ?? DEFAULT_PACKAGE_DEFAULTS.heightMm,
    }

    if (needsGlobalDefaults) {
      const globalSettings = await settingsService.getSettingsMap(
        [
          'cdek_default_package_weight_g',
          'cdek_default_package_length_mm',
          'cdek_default_package_width_mm',
          'cdek_default_package_height_mm',
        ],
        {}
      )
      packageDefaults = {
        weightG: brandDefaults.weightG ?? parsePositiveIntOrNull(globalSettings.cdek_default_package_weight_g) ?? DEFAULT_PACKAGE_DEFAULTS.weightG,
        lengthMm:
          brandDefaults.lengthMm ??
          parsePositiveIntOrNull(globalSettings.cdek_default_package_length_mm) ??
          DEFAULT_PACKAGE_DEFAULTS.lengthMm,
        widthMm:
          brandDefaults.widthMm ??
          parsePositiveIntOrNull(globalSettings.cdek_default_package_width_mm) ??
          DEFAULT_PACKAGE_DEFAULTS.widthMm,
        heightMm:
          brandDefaults.heightMm ??
          parsePositiveIntOrNull(globalSettings.cdek_default_package_height_mm) ??
          DEFAULT_PACKAGE_DEFAULTS.heightMm,
      }
    }

    const packages = buildSafePackagesForCdekOrderRegistration(
      mergeCdekPackages(
      order.items.map((item) =>
        productToCdekPackage(
          item.product.weight,
          item.product.length,
          item.product.width,
          item.product.height,
          item.quantity,
          packageDefaults
        )
      )
      )
    )

    const packageItems = order.items.map((item) => ({
      name: item.product.title?.slice(0, 255) || 'Товар',
      ware_key: buildCdekWareKey({
        sku: item.product.sku,
        title: item.product.title,
      }).slice(0, 255),
      cost: item.price,
      amount: item.quantity,
      weight: Math.max(
        1,
        Math.round(
          (typeof item.product.weight === 'number' && item.product.weight > 0
            ? item.product.weight
            : packageDefaults.weightG) * item.quantity
        )
      ),
      payment: { value: 0 },
    }))

    let deliveryPointCode: string | undefined
    let toLocation: Record<string, unknown> | undefined
    if (sh.deliveryMethod === 'cdek_pvz') {
      const pvzCode = sh.cdekPvzCode?.trim() || extractCdekPvzCodeFromAddress(sh.address)
      if (!pvzCode) {
        return { error: 'Не найден код ПВЗ в заказе' }
      }
      deliveryPointCode = pvzCode
    } else {
      const doorAddress = buildCdekDoorAddress({
        address: sh.address,
        street: sh.street,
        house: sh.house,
        apartment: sh.apartment,
        entrance: sh.entrance,
        floor: sh.floor,
        intercom: sh.intercom,
      })
      if (!doorAddress) {
        return { error: 'Не указан адрес доставки' }
      }
      toLocation = {
        ...(sh.cdekCityUuid?.trim()
          ? {
              city_uuid: sh.cdekCityUuid.trim(),
              address: doorAddress,
            }
          : {
              code: sh.cdekCityCode,
              country_code: 'RU' as const,
              address: doorAddress,
            }),
      }
    }

    const body = {
      type: 1,
      tariff_code: sh.cdekTariffCode,
      number: orderId,
      shipment_point: senderSettings.fromPvzCode,
      ...(deliveryPointCode ? { delivery_point: deliveryPointCode } : {}),
      ...(toLocation ? { to_location: toLocation } : {}),
      recipient: {
        name: sh.fullName,
        phones: [{ number: sh.phone }],
        ...(sh.email ? { email: sh.email } : {}),
      },
      sender: {
        name: senderSettings.senderName,
        ...(senderSettings.senderPhone ? { phones: [{ number: senderSettings.senderPhone }] } : {}),
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

    const token = await getCdekToken(scopedCredentials)
    const base = getCdekApiBase(scopedCredentials)
    console.warn('[CDEK createOrder][payload-json]', JSON.stringify(body))
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
    let data: {
      entity?: { uuid?: string; cdek_number?: string; track_number?: string }
      uuid?: string
      cdek_number?: string
      track_number?: string
    }
    try {
      data = JSON.parse(text) as { entity?: { uuid?: string }; uuid?: string }
    } catch {
      return { error: `СДЭК: неверный ответ ${text.slice(0, 100)}` }
    }
    const uuid = data.entity?.uuid ?? data.uuid
    const trackNumber = parseTrackNumberFromCdekOrderPayload(data)
    if (!uuid) {
      return { error: `СДЭК: в ответе нет uuid. ${text.slice(0, 200)}` }
    }
    const snapshot = await getCdekOrderSnapshotByUuid(uuid, scopedCredentials)
    if (snapshot.validationError) {
      return { error: snapshot.validationError }
    }
    return { uuid, trackNumber }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[CDEK createOrder]', orderId, e)
    return { error: message }
  }
}

interface CdekOrderRequestError {
  code?: string
  message?: string
}

interface CdekOrderRequestState {
  state?: string
  errors?: CdekOrderRequestError[]
}

interface CdekOrderLookupResponse {
  entity?: { cdek_number?: string; track_number?: string }
  cdek_number?: string
  track_number?: string
  requests?: CdekOrderRequestState[]
}

function extractCdekOrderValidationError(data: CdekOrderLookupResponse): string | null {
  const invalidRequests = (data.requests ?? []).filter(
    (request) => request.state?.toUpperCase() === 'INVALID'
  )
  if (invalidRequests.length === 0) return null

  const parts = invalidRequests
    .flatMap((request) => request.errors ?? [])
    .map((error) => [error.code?.trim(), error.message?.trim()].filter(Boolean).join(': '))
    .filter((part) => part.length > 0)

  if (parts.length === 0) {
    return 'СДЭК: заказ создан, но отклонён при валидации'
  }

  return `СДЭК: ${parts.join('; ')}`
}

async function getCdekOrderSnapshotByUuid(
  uuid: string,
  creds?: CdekCredentials | null
): Promise<{ trackNumber: string | null; validationError: string | null }> {
  const token = await getCdekToken(creds)
  const base = getCdekApiBase(creds)
  const response = await fetch(`${base}/orders/${encodeURIComponent(uuid)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`СДЭК: ${response.status} ${text.slice(0, 200)}`)
  }

  let data: CdekOrderLookupResponse
  try {
    data = JSON.parse(text) as CdekOrderLookupResponse
  } catch {
    throw new Error(`СДЭК: неверный ответ ${text.slice(0, 100)}`)
  }

  return {
    trackNumber: parseTrackNumberFromCdekOrderPayload(data),
    validationError: extractCdekOrderValidationError(data),
  }
}

export async function syncCdekTrackNumberIfDue(
  orderId: string
): Promise<{ checked: boolean; trackNumber?: string | null }> {
  const orderService = await import('@/services/order.service')
  const settingsService = await import('@/services/settings.service')
  const cdekTrackEmail = await import('@/lib/cdek-track-email')
  const candidate = await orderService.findOrderForCdekTrackSync(orderId)
  if (!candidate?.cdekOrderUuid || candidate.cdekTrackNumber) {
    return { checked: false, trackNumber: candidate?.cdekTrackNumber ?? null }
  }
  if (
    candidate.shippingInfo?.deliveryMethod !== 'cdek_pvz' &&
    candidate.shippingInfo?.deliveryMethod !== 'cdek_door'
  ) {
    return { checked: false, trackNumber: null }
  }

  const now = new Date()
  const intervalMs = getCdekTrackSyncIntervalMs(candidate.createdAt, now)
  if (intervalMs == null) return { checked: false, trackNumber: null }
  if (
    candidate.cdekTrackCheckedAt &&
    now.getTime() - candidate.cdekTrackCheckedAt.getTime() < intervalMs
  ) {
    return { checked: false, trackNumber: null }
  }

  const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)
  const scopedCredentials = await settingsService.getCdekCredentials({
    brandId: orderBrandId,
  })

  try {
    const snapshot = await getCdekOrderSnapshotByUuid(candidate.cdekOrderUuid, scopedCredentials)
    const trackNumber = snapshot.trackNumber
    await orderService.updateOrder(orderId, {
      cdekTrackCheckedAt: now,
      ...(trackNumber ? { cdekTrackNumber: trackNumber, cdekOrderError: null } : {}),
      ...(snapshot.validationError ? { cdekOrderError: snapshot.validationError } : {}),
    })
    if (!candidate.cdekTrackNumber && trackNumber) {
      void cdekTrackEmail.sendCdekTrackEmailsForOrder(orderId, trackNumber)
    }
    return { checked: true, trackNumber }
  } catch (error) {
    console.error('[CDEK syncTrackNumber]', orderId, error)
    await orderService.updateOrder(orderId, {
      cdekTrackCheckedAt: now,
    })
    return { checked: true, trackNumber: null }
  }
}

export async function syncCdekTrackNumbersForOrderIds(orderIds: string[]): Promise<void> {
  const uniqueOrderIds = Array.from(new Set(orderIds.filter(Boolean))).slice(0, CDEK_TRACK_SYNC_BATCH_LIMIT)
  for (const orderId of uniqueOrderIds) {
    await syncCdekTrackNumberIfDue(orderId)
  }
}
