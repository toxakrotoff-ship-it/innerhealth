/**
 * Allowlist IP-адресов ЮKassa для верификации webhook (defence-in-depth).
 * Источник: https://yookassa.ru/developers/using-api/webhooks#notification-authentication
 *
 * Webhook сам по себе уже верифицирует уведомление через GET /payments/{id}
 * с приватными ключами; IP-чек — лишь дополнительный фильтр от подделок.
 *
 * Поддерживается отключение через `YOOKASSA_IP_FILTER=off` в окружении —
 * полезно, если ЮKassa добавит новый диапазон или у нас сменится прокси.
 */

interface CidrRange {
  base: bigint
  prefix: number
  bits: 32 | 128
}

const YOOKASSA_RANGES: ReadonlyArray<string> = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.154.128/25',
  '77.75.156.11/32',
  '77.75.156.35/32',
  '2a02:5180::/32',
]

let cachedRanges: ReadonlyArray<CidrRange> | null = null

function parseRanges(): ReadonlyArray<CidrRange> {
  if (cachedRanges) return cachedRanges
  cachedRanges = YOOKASSA_RANGES.map(parseCidr).filter(
    (r): r is CidrRange => r !== null
  )
  return cachedRanges
}

function parseCidr(cidr: string): CidrRange | null {
  const [addr, prefixRaw] = cidr.split('/')
  if (!addr) return null
  const isIpv6 = addr.includes(':')
  const bits: 32 | 128 = isIpv6 ? 128 : 32
  const prefix = prefixRaw == null ? bits : Number.parseInt(prefixRaw, 10)
  if (!Number.isFinite(prefix) || prefix < 0 || prefix > bits) return null
  const base = ipToBigInt(addr)
  if (base === null) return null
  const mask = bits === 128 ? maskBits(prefix, 128) : maskBits(prefix, 32)
  return { base: base & mask, prefix, bits }
}

const ZERO = BigInt(0)
const ONE = BigInt(1)
const BYTE_SHIFT = BigInt(8)
const GROUP_SHIFT = BigInt(16)
const FFFF = BigInt(0xffff)

function maskBits(prefix: number, bits: 32 | 128): bigint {
  if (prefix <= 0) return ZERO
  if (prefix >= bits) return (ONE << BigInt(bits)) - ONE
  return ((ONE << BigInt(prefix)) - ONE) << BigInt(bits - prefix)
}

function ipToBigInt(addr: string): bigint | null {
  if (!addr) return null
  const trimmed = addr.trim()
  if (trimmed.includes(':')) return ipv6ToBigInt(trimmed)
  return ipv4ToBigInt(trimmed)
}

function ipv4ToBigInt(addr: string): bigint | null {
  const parts = addr.split('.')
  if (parts.length !== 4) return null
  let result = ZERO
  for (const part of parts) {
    const n = Number.parseInt(part, 10)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    result = (result << BYTE_SHIFT) | BigInt(n)
  }
  return result
}

function ipv6ToBigInt(addr: string): bigint | null {
  const noZone = addr.split('%')[0]
  let mappedV4: bigint | null = null
  let working = noZone
  const lastColon = working.lastIndexOf(':')
  if (lastColon !== -1 && working.includes('.', lastColon)) {
    const v4 = ipv4ToBigInt(working.slice(lastColon + 1))
    if (v4 === null) return null
    mappedV4 = v4
    working = `${working.slice(0, lastColon + 1)}${(v4 >> GROUP_SHIFT).toString(16)}:${(v4 & FFFF).toString(16)}`
  }
  const sides = working.split('::')
  if (sides.length > 2) return null
  const head = sides[0] === '' ? [] : sides[0].split(':')
  const tail = sides.length === 2 ? (sides[1] === '' ? [] : sides[1].split(':')) : null
  const totalGroups = 8
  const filled = tail
    ? [...head, ...new Array(totalGroups - head.length - tail.length).fill('0'), ...tail]
    : head
  if (filled.length !== totalGroups) return null
  let result = ZERO
  for (const group of filled) {
    if (group.length === 0 || group.length > 4) return null
    const value = Number.parseInt(group, 16)
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) return null
    result = (result << GROUP_SHIFT) | BigInt(value)
  }
  if (mappedV4 !== null) {
    // sanity-check: trailing 32 bits should match the embedded IPv4
    const mask32 = (ONE << BigInt(32)) - ONE
    if ((result & mask32) !== mappedV4) return null
  }
  return result
}

function isInRange(addr: bigint, isIpv6: boolean, range: CidrRange): boolean {
  if ((range.bits === 128) !== isIpv6) return false
  const mask = maskBits(range.prefix, range.bits)
  return (addr & mask) === range.base
}

/**
 * Возвращает первый IP клиента из заголовка `x-forwarded-for`
 * (формат: «client, proxy1, proxy2»). Без пробелов и пустых значений.
 */
export function extractClientIpFromForwarded(forwardedFor: string | null): string | null {
  if (!forwardedFor) return null
  const first = forwardedFor.split(',')[0]?.trim()
  if (!first) return null
  return first
}

/**
 * Проверяет, принадлежит ли IP-адрес allowlist'у ЮKassa.
 * Если адрес не парсится — возвращает false.
 */
export function isYookassaIp(ip: string | null | undefined): boolean {
  if (!ip) return false
  // Strip wrappers like brackets in `[2a02:5180::1]` and zone in `fe80::1%eth0`.
  let normalized = ip.trim()
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1)
  }
  const isIpv6 = normalized.includes(':')
  const value = ipToBigInt(normalized)
  if (value === null) return false
  return parseRanges().some((range) => isInRange(value, isIpv6, range))
}

/**
 * Включён ли IP-фильтр? Управляется env `YOOKASSA_IP_FILTER`:
 * — `off` / `false` / `0` — выключено;
 * — иначе включено (по умолчанию).
 */
export function isYookassaIpFilterEnabled(): boolean {
  const raw = (process.env.YOOKASSA_IP_FILTER ?? '').trim().toLowerCase()
  return raw !== 'off' && raw !== 'false' && raw !== '0'
}
