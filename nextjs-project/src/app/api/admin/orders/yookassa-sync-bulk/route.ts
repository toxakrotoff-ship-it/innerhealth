import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/require-admin'
import type { BrandId } from '@/lib/brand/brand'
import { resolveBrandFromRequest } from '@/lib/brand/brand-request'
import { getYookassaPayment } from '@/lib/yookassa'
import * as orderService from '@/services/order.service'
import * as settingsService from '@/services/settings.service'
import { scheduleNotifyAllChannelsAfterOrderPaid } from '@/lib/order-paid-notifications'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(7),
  take: z.coerce.number().int().min(1).max(200).default(50),
})

interface BulkItemResult {
  orderId: string
  paymentId: string
  paymentStatus: string | null
  previousOrderStatus: string
  orderStatus: string
  updated: boolean
  error?: string
}

interface YookassaBulkSyncResponse {
  ok: boolean
  days: number
  take: number
  scanned: number
  updated: number
  updatedToPaid: number
  updatedToCanceled: number
  errors: number
  items: BulkItemResult[]
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    days: url.searchParams.get('days') ?? undefined,
    take: url.searchParams.get('take') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query' },
      { status: 400 }
    )
  }

  const { days, take } = parsed.data
  const brandId = resolveBrandFromRequest(request)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const candidates = await orderService.getPendingOrdersWithYookassaPayment({
    since,
    take,
    brandId,
  })

  const credentialsByBrand = new Map<BrandId, { shopId: string; secretKey: string } | undefined>()

  async function getCredentialsForOrderBrand(orderBrand: BrandId) {
    const cached = credentialsByBrand.get(orderBrand)
    if (cached !== undefined) return cached
    const yookassaSettings = await settingsService.getYookassaSettingsMap({ brandId: orderBrand })
    const shopIdFromAdmin = (yookassaSettings.yookassa_shop_id ?? '').trim()
    const secretKeyFromAdmin = (yookassaSettings.yookassa_secret_key ?? '').trim()
    const hasFromAdmin = shopIdFromAdmin.length > 0 && secretKeyFromAdmin.length > 0
    const credentials = hasFromAdmin ? { shopId: shopIdFromAdmin, secretKey: secretKeyFromAdmin } : undefined
    credentialsByBrand.set(orderBrand, credentials)
    return credentials
  }

  const items: BulkItemResult[] = []
  let updated = 0
  let updatedToPaid = 0
  let updatedToCanceled = 0
  let errors = 0

  for (const candidate of candidates) {
    const previousOrderStatus = candidate.status
    const paymentId = candidate.yookassaPaymentId
    try {
      const credentials = await getCredentialsForOrderBrand(candidate.brand)
      const payment = await getYookassaPayment(paymentId, credentials)
      const paymentStatus = payment?.status ?? null
      if (!paymentStatus) {
        errors++
        items.push({
          orderId: candidate.id,
          paymentId,
          paymentStatus: null,
          previousOrderStatus,
          orderStatus: previousOrderStatus,
          updated: false,
          error: 'Не удалось получить статус платежа в ЮKassa',
        })
        continue
      }

      let orderStatus = previousOrderStatus
      let wasUpdated = false

      if (paymentStatus === 'succeeded' && previousOrderStatus !== 'paid') {
        await orderService.updateOrderStatus(candidate.id, 'paid')
        orderStatus = 'paid'
        wasUpdated = true
        updated++
        updatedToPaid++
        scheduleNotifyAllChannelsAfterOrderPaid(candidate.id)
      } else if (paymentStatus === 'canceled' && previousOrderStatus === 'pending') {
        await orderService.updateOrderStatus(candidate.id, 'canceled')
        orderStatus = 'canceled'
        wasUpdated = true
        updated++
        updatedToCanceled++
      }

      items.push({
        orderId: candidate.id,
        paymentId,
        paymentStatus,
        previousOrderStatus,
        orderStatus,
        updated: wasUpdated,
      })
    } catch (err) {
      errors++
      items.push({
        orderId: candidate.id,
        paymentId,
        paymentStatus: null,
        previousOrderStatus,
        orderStatus: previousOrderStatus,
        updated: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const response: YookassaBulkSyncResponse = {
    ok: true,
    days,
    take,
    scanned: candidates.length,
    updated,
    updatedToPaid,
    updatedToCanceled,
    errors,
    items,
  }

  return NextResponse.json(response)
}

