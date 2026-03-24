export interface TildaLeadColumnIndexes {
  email: number
  name: number
  phone: number
  date: number
  tranid: number
  input: number
  input2: number
  comment: number
  deliveryAddress: number
  review: number
  delivery: number
  promoCode: number
  orderComposition: number
  amount: number
  prodAmount: number
  orderId: number
  orderCurrency: number
  paymentId: number
  paymentStatus: number
  paymentMethod: number
  discount: number
  subtotal: number
  deliveryName: number
  deliveryAddressAlt: number
  deliveryComment: number
}

export interface ParsedTildaLeadRow {
  tranid: string | null
  tildaDate: Date | null
  email: string | null
  name: string | null
  phone: string | null
  input: string | null
  input2: string | null
  comment: string | null
  deliveryAddress: string | null
  review: string | null
  delivery: string | null
  promoCode: string | null
}

const LEGACY_COLUMN_INDEXES: TildaLeadColumnIndexes = {
  email: 0,
  name: 1,
  phone: 2,
  date: 3,
  tranid: 4,
  input: 7,
  input2: 8,
  comment: 9,
  deliveryAddress: 10,
  review: 11,
  delivery: 12,
  promoCode: 14,
  orderComposition: -1,
  amount: -1,
  prodAmount: -1,
  orderId: -1,
  orderCurrency: -1,
  paymentId: -1,
  paymentStatus: -1,
  paymentMethod: -1,
  discount: -1,
  subtotal: -1,
  deliveryName: -1,
  deliveryAddressAlt: -1,
  deliveryComment: -1,
}

const HEADER_ALIASES: Record<keyof TildaLeadColumnIndexes, readonly string[]> = {
  email: ['email', 'e-mail', 'элпочта', 'почта'],
  name: ['name', 'имя'],
  phone: ['phone', 'телефон'],
  date: ['date', 'created', 'дата'],
  tranid: ['tranid', 'tran_id', 'transactionid', 'idтранзакции', 'idзаявки'],
  input: ['input'],
  input2: ['input2', 'input_2'],
  comment: ['комментарии', 'комментарий', 'comment', 'comments'],
  deliveryAddress: ['адресдоставки', 'адрес_доставки', 'deliveryaddress'],
  review: ['отзыв', 'review'],
  delivery: ['доставка', 'delivery'],
  promoCode: ['промокод', 'promocode', 'promo', 'promo code'],
  orderComposition: ['составзаказа', 'товары', 'products', 'product', 'orderitems'],
  amount: ['суммазаказа', 'amount', 'orderaamount'],
  prodAmount: ['prodamount', 'productsamount', 'сумматоваров'],
  orderId: ['idзаказа', 'tildaorderid', 'orderid'],
  orderCurrency: ['tildaordercurrency', 'currency', 'валюта'],
  paymentId: ['idплатежа', 'paymentid'],
  paymentStatus: ['статусоплаты', 'paymentstatus', 'tildastatus'],
  paymentMethod: ['способоплаты', 'paymentmethod', 'paymentsystem'],
  discount: ['скидка', 'discount'],
  subtotal: ['subtotal', 'subtotalsum'],
  deliveryName: ['orderdeliveryname', 'службадоставки'],
  deliveryAddressAlt: ['orderdeliveryaddress', 'адресдоставки'],
  deliveryComment: ['orderdeliverycomment', 'комментарийдоставки'],
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^"|"$/g, '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '')
}

export function parseCsvLine(line: string): string[] {
  return parseCsvLineWithDelimiter(line, detectCsvDelimiter(line))
}

export function parseCsvLineWithDelimiter(line: string, delimiter: ';' | ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

export function detectCsvDelimiter(line: string): ';' | ',' {
  const semicolons = countDelimiterOutsideQuotes(line, ';')
  const commas = countDelimiterOutsideQuotes(line, ',')
  return commas > semicolons ? ',' : ';'
}

function countDelimiterOutsideQuotes(line: string, delimiter: ';' | ','): number {
  let inQuotes = false
  let count = 0

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) count++
  }

  return count
}

export function parseTildaDate(value: string): Date | null {
  const trimmed = value.replace(/^"|"$/g, '').trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function safeStr(value: string | undefined): string | null {
  if (value === undefined) return null
  const trimmed = value.replace(/^"|"$/g, '').trim()
  return trimmed === '' ? null : trimmed
}

function findColumnIndex(
  normalizedHeader: string[],
  field: keyof TildaLeadColumnIndexes,
  allowLegacyFallback: boolean
): number {
  const aliases = HEADER_ALIASES[field]
  const direct = normalizedHeader.findIndex((name) => aliases.includes(name))
  if (direct >= 0) return direct
  return allowLegacyFallback ? LEGACY_COLUMN_INDEXES[field] : -1
}

export function resolveTildaLeadColumnIndexes(headerColumns: string[]): TildaLeadColumnIndexes {
  const normalizedHeader = headerColumns.map(normalizeHeader)
  const allowLegacyFallback =
    normalizedHeader.includes('tranid') ||
    normalizedHeader.includes('input') ||
    normalizedHeader.includes('input2') ||
    normalizedHeader.includes('комментарии')

  return {
    email: findColumnIndex(normalizedHeader, 'email', allowLegacyFallback),
    name: findColumnIndex(normalizedHeader, 'name', allowLegacyFallback),
    phone: findColumnIndex(normalizedHeader, 'phone', allowLegacyFallback),
    date: findColumnIndex(normalizedHeader, 'date', allowLegacyFallback),
    tranid: findColumnIndex(normalizedHeader, 'tranid', allowLegacyFallback),
    input: findColumnIndex(normalizedHeader, 'input', allowLegacyFallback),
    input2: findColumnIndex(normalizedHeader, 'input2', allowLegacyFallback),
    comment: findColumnIndex(normalizedHeader, 'comment', allowLegacyFallback),
    deliveryAddress: findColumnIndex(normalizedHeader, 'deliveryAddress', allowLegacyFallback),
    review: findColumnIndex(normalizedHeader, 'review', allowLegacyFallback),
    delivery: findColumnIndex(normalizedHeader, 'delivery', allowLegacyFallback),
    promoCode: findColumnIndex(normalizedHeader, 'promoCode', allowLegacyFallback),
    orderComposition: findColumnIndex(normalizedHeader, 'orderComposition', allowLegacyFallback),
    amount: findColumnIndex(normalizedHeader, 'amount', allowLegacyFallback),
    prodAmount: findColumnIndex(normalizedHeader, 'prodAmount', allowLegacyFallback),
    orderId: findColumnIndex(normalizedHeader, 'orderId', allowLegacyFallback),
    orderCurrency: findColumnIndex(normalizedHeader, 'orderCurrency', allowLegacyFallback),
    paymentId: findColumnIndex(normalizedHeader, 'paymentId', allowLegacyFallback),
    paymentStatus: findColumnIndex(normalizedHeader, 'paymentStatus', allowLegacyFallback),
    paymentMethod: findColumnIndex(normalizedHeader, 'paymentMethod', allowLegacyFallback),
    discount: findColumnIndex(normalizedHeader, 'discount', allowLegacyFallback),
    subtotal: findColumnIndex(normalizedHeader, 'subtotal', allowLegacyFallback),
    deliveryName: findColumnIndex(normalizedHeader, 'deliveryName', allowLegacyFallback),
    deliveryAddressAlt: findColumnIndex(normalizedHeader, 'deliveryAddressAlt', allowLegacyFallback),
    deliveryComment: findColumnIndex(normalizedHeader, 'deliveryComment', allowLegacyFallback),
  }
}

function getValueByIndex(row: string[], index: number): string | null {
  if (index < 0) return null
  return safeStr(row[index])
}

export function parseTildaLeadRow(
  row: string[],
  indexes: TildaLeadColumnIndexes
): ParsedTildaLeadRow {
  const input = getValueByIndex(row, indexes.input)
  const input2 = getValueByIndex(row, indexes.input2)
  const composition = getValueByIndex(row, indexes.orderComposition)
  const productLine = composition && composition.toLowerCase() !== 'cart' ? composition : null
  const amount = getValueByIndex(row, indexes.amount)
  const prodAmount = getValueByIndex(row, indexes.prodAmount)
  const discount = getValueByIndex(row, indexes.discount)
  const subtotal = getValueByIndex(row, indexes.subtotal)
  const paymentId = getValueByIndex(row, indexes.paymentId)
  const paymentStatus = getValueByIndex(row, indexes.paymentStatus)
  const paymentMethod = getValueByIndex(row, indexes.paymentMethod)
  const orderId = getValueByIndex(row, indexes.orderId)
  const orderCurrency = getValueByIndex(row, indexes.orderCurrency)
  const deliveryName = getValueByIndex(row, indexes.deliveryName)
  const deliveryAddressAlt = getValueByIndex(row, indexes.deliveryAddressAlt)
  const deliveryComment = getValueByIndex(row, indexes.deliveryComment)

  const orderMeta = {
    amount,
    prodAmount,
    discount,
    subtotal,
    paymentId,
    paymentStatus,
    paymentMethod,
    orderId,
    orderCurrency,
    deliveryName,
  }

  const hasOrderMeta = Object.values(orderMeta).some((value) => value !== null)
  const normalizedInput = input && input.toLowerCase() !== 'cart' ? input : null
  const normalizedInput2 = input2 && input2.toLowerCase() !== 'cart' ? input2 : null

  return {
    tranid: getValueByIndex(row, indexes.tranid) ?? orderId,
    tildaDate: parseTildaDate(row[indexes.date] ?? ''),
    email: getValueByIndex(row, indexes.email),
    name: getValueByIndex(row, indexes.name),
    phone: getValueByIndex(row, indexes.phone),
    input: normalizedInput ?? productLine,
    input2: normalizedInput2 ?? (hasOrderMeta ? JSON.stringify(orderMeta) : null),
    comment: getValueByIndex(row, indexes.comment) ?? deliveryComment,
    deliveryAddress: getValueByIndex(row, indexes.deliveryAddress) ?? deliveryAddressAlt,
    review: getValueByIndex(row, indexes.review),
    delivery: getValueByIndex(row, indexes.delivery) ?? deliveryName,
    promoCode: getValueByIndex(row, indexes.promoCode),
  }
}
