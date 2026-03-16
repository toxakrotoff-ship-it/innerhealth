/**
 * Интеграция с API ЮKassa (https://yookassa.ru/developers).
 * Создание платежа (redirect), чек 54-ФЗ, идемпотентность.
 *
 * Учётные данные: из params.credentials или из env (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY).
 * APP_URL или NEXTAUTH_URL — базовый URL для return_url (опционально).
 */

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

export interface YookassaCredentials {
  shopId: string
  secretKey: string
}

function buildAuthHeader(credentials: YookassaCredentials): string {
  const encoded = Buffer.from(`${credentials.shopId}:${credentials.secretKey}`).toString('base64')
  return `Basic ${encoded}`
}

function getCredentials(override?: YookassaCredentials | null): YookassaCredentials {
  if (override?.shopId && override?.secretKey) {
    return { shopId: override.shopId, secretKey: override.secretKey }
  }
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) {
    throw new Error('YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required')
  }
  return { shopId, secretKey }
}

function getBaseUrl(): string {
  const url = process.env.APP_URL ?? process.env.NEXTAUTH_URL
  if (url) return url.replace(/\/$/, '')
  return 'http://localhost:3000'
}

/** Позиция чека 54-ФЗ для одного товара/услуги */
export interface YookassaReceiptItem {
  description: string
  quantity: number
  amount: { value: string; currency: string }
  vat_code: number
  payment_mode: 'full_prepayment' | 'full_payment'
  payment_subject: 'commodity' | 'service'
}

/** Параметры создания платежа ЮKassa */
export interface CreatePaymentParams {
  /** Сумма в рублях (число, будет отформатировано "0.00") */
  amount: number
  /** Описание заказа (до 128 символов) */
  description: string
  /** ID заказа в нашей БД (для metadata и webhook) */
  orderId: string
  /** Email покупателя (для чека 54-ФЗ) */
  customerEmail: string
  /** Позиции чека: товары/услуги с суммами */
  receiptItems: YookassaReceiptItem[]
  /** URL возврата после оплаты (успех) */
  returnUrl: string
  /** Ключ идемпотентности (уникальный на запрос) */
  idempotenceKey: string
  /** Учётные данные ЮKassa (если не заданы — берутся из env) */
  credentials?: YookassaCredentials | null
}

/** Ответ API создания платежа (нужные поля) */
export interface YookassaPaymentResponse {
  id: string
  status: string
  amount: { value: string; currency: string }
  confirmation?: {
    type: string
    confirmation_url?: string
  }
}

/** Ответ GET /payments/{id} — только нужные поля для верификации webhook. */
export interface YookassaGetPaymentResponse {
  id: string
  status: string
  metadata?: { orderId?: string }
}

/**
 * Создаёт платёж в ЮKassa и возвращает confirmation_url для редиректа.
 * Платёж в одну стадию (capture: true), с чеком 54-ФЗ.
 */
export async function createYookassaPayment(
  params: CreatePaymentParams
): Promise<{ paymentId: string; confirmationUrl: string }> {
  const credentials = getCredentials(params.credentials)
  const auth = buildAuthHeader(credentials)
  const body = {
    amount: {
      value: params.amount.toFixed(2),
      currency: 'RUB',
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: params.returnUrl,
    },
    description: params.description.slice(0, 128),
    metadata: { orderId: params.orderId },
    receipt: {
      customer: { email: params.customerEmail },
      items: params.receiptItems.map((item) => ({
        description: item.description.slice(0, 128),
        quantity: item.quantity,
        amount: {
          value: item.amount.value,
          currency: item.amount.currency,
        },
        vat_code: item.vat_code,
        payment_mode: item.payment_mode,
        payment_subject: item.payment_subject,
      })),
    },
  }

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Idempotence-Key': params.idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    let message = `YooKassa API error ${res.status}`
    try {
      const errJson = JSON.parse(errText)
      if (errJson.description) message = errJson.description
      if (errJson.code) message = `${errJson.code}: ${message}`
    } catch {
      if (errText) message = errText.slice(0, 200)
    }
    throw new Error(message)
  }

  const data = (await res.json()) as YookassaPaymentResponse
  const url = data.confirmation?.confirmation_url
  if (!url) {
    throw new Error('YooKassa did not return confirmation_url')
  }
  return { paymentId: data.id, confirmationUrl: url }
}

/**
 * Запрашивает текущий статус платежа в ЮKassa (GET /payments/{id}).
 * Используется для верификации webhook перед установкой статуса заказа «оплачен».
 * @returns Объект со статусом или null при ошибке/404.
 */
export async function getYookassaPayment(
  paymentId: string,
  credentials?: YookassaCredentials | null
): Promise<{ status: string; metadata?: { orderId?: string } } | null> {
  const creds = getCredentials(credentials)
  const auth = buildAuthHeader(creds)
  const res = await fetch(`${YOOKASSA_API}/payments/${paymentId}`, {
    method: 'GET',
    headers: { Authorization: auth },
  })
  if (!res.ok) return null
  const data = (await res.json()) as YookassaGetPaymentResponse
  return { status: data.status, metadata: data.metadata }
}

/** Result of checking YooKassa API connection (credentials and network). */
export interface YookassaConnectionCheck {
  ok: boolean
  error?: string
}

/**
 * Проверяет подключение к API ЮKassa: валидность учётных данных и доступность API.
 * Выполняет GET /payments?limit=1 — при 200 подключение OK, при 401 неверные учётные данные.
 */
export async function checkYookassaConnection(
  credentials?: YookassaCredentials | null
): Promise<YookassaConnectionCheck> {
  try {
    const creds = getCredentials(credentials)
    const auth = buildAuthHeader(creds)
    const res = await fetch(`${YOOKASSA_API}/payments?limit=1`, {
      method: 'GET',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
    })
    if (res.status === 401) {
      return { ok: false, error: 'Неверный Shop ID или секретный ключ' }
    }
    if (!res.ok) {
      const errText = await res.text()
      let message = `HTTP ${res.status}`
      try {
        const errJson = JSON.parse(errText)
        if (errJson.description) message = errJson.description
        if (errJson.code) message = `${errJson.code}: ${message}`
      } catch {
        if (errText) message = errText.slice(0, 200)
      }
      return { ok: false, error: message }
    }
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

/**
 * Формирует позиции чека 54-ФЗ из позиций заказа.
 * Сумма позиций должна совпадать с суммой платежа (требование ЮKassa).
 * @param orderItems — позиции заказа (название, кол-во, цена за единицу).
 * @param vatCode — код НДС (1 — без НДС, 2—6 — см. документацию ЮKassa).
 * @param targetGoodsTotal — целевая сумма по товарам (например, после скидки). Если не задана, используется сумма (price × quantity).
 */
export function buildReceiptItemsFromOrderItems(
  orderItems: Array<{ description: string; quantity: number; price: number }>,
  vatCode: number = 1,
  targetGoodsTotal?: number
): YookassaReceiptItem[] {
  const fullSubtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalToUse = targetGoodsTotal ?? fullSubtotal

  if (orderItems.length === 0) return []
  if (fullSubtotal <= 0) return []

  const scale = totalToUse / fullSubtotal
  const amounts: number[] = []
  let runningSum = 0

  for (let i = 0; i < orderItems.length; i++) {
    const lineTotal = orderItems[i].price * orderItems[i].quantity
    const scaled = lineTotal * scale
    const value =
      i < orderItems.length - 1
        ? Math.round(scaled * 100) / 100
        : Math.max(0, totalToUse - runningSum)
    amounts.push(value)
    runningSum += value
  }

  return orderItems.map((item, i) => ({
    description: item.description.slice(0, 128),
    quantity: item.quantity,
    amount: { value: amounts[i].toFixed(2), currency: 'RUB' },
    vat_code: vatCode,
    payment_mode: 'full_prepayment',
    payment_subject: 'commodity',
  }))
}

/**
 * Добавляет позицию «Доставка» в чек, если deliverySum > 0.
 * Сумма доставки должна совпадать с переданной в amount платежа (товары + доставка).
 */
export function appendDeliveryReceiptItem(
  items: YookassaReceiptItem[],
  deliverySum: number,
  vatCode: number = 1
): YookassaReceiptItem[] {
  if (deliverySum <= 0) return items
  return [
    ...items,
    {
      description: 'Доставка',
      quantity: 1,
      amount: { value: deliverySum.toFixed(2), currency: 'RUB' },
      vat_code: vatCode,
      payment_mode: 'full_prepayment',
      payment_subject: 'service',
    },
  ]
}

export { getBaseUrl }
