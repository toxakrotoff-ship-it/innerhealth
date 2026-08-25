import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { CheckoutStatus, CheckoutStep } from '@prisma/client'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { listSessionsForAdmin } from '@/services/checkout-session.service'

const CHECKOUT_STATUSES: readonly CheckoutStatus[] = [
  'ACTIVE',
  'ABANDONED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'COMPLETED',
  'EXPIRED',
]
const CHECKOUT_STEPS: readonly CheckoutStep[] = [
  'CART',
  'CONTACT',
  'DELIVERY',
  'CONFIRMATION',
  'ORDER_CREATED',
  'PAYMENT_INITIALIZATION',
  'PAYMENT_CREATED',
  'PAYMENT_REDIRECT',
  'PAYMENT_PROCESSING',
  'COMPLETED',
]

const boolParam = z
  .enum(['1', 'true'])
  .optional()
  .transform((v) => v != null)

const querySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: z
    .string()
    .optional()
    .transform((v) => v?.split(',').filter((s): s is CheckoutStatus => CHECKOUT_STATUSES.includes(s as CheckoutStatus))),
  step: z
    .string()
    .optional()
    .transform((v) => v?.split(',').filter((s): s is CheckoutStep => CHECKOUT_STEPS.includes(s as CheckoutStep))),
  hasPhone: boolParam,
  hasEmail: boolParam,
  hasOrder: boolParam,
  hasPayment: boolParam,
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brand = resolveAdminBrandFromRequest(request)
  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 })
  }

  const { status, step, ...rest } = parsed.data

  try {
    const result = await listSessionsForAdmin({
      brand,
      statuses: status,
      steps: step,
      ...rest,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/checkout-sessions] Failed to list sessions:', error)
    return NextResponse.json(
      { error: 'Не удалось загрузить список' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
