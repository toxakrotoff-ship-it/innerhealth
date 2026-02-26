import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import * as quickOrderService from '@/services/quick-order.service'

const QUICK_ORDER_RATE_LIMIT = 8

const quickOrderSchema = z.object({
  productId: z.string().trim().min(1, 'Товар не указан'),
  quantity: z.number().int().min(1).max(99).default(1),
  name: z
    .string()
    .trim()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(120, 'Имя слишком длинное')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(6, 'Укажите корректный телефон')
    .max(30, 'Телефон слишком длинный'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Комментарий слишком длинный')
    .optional()
    .or(z.literal('')),
})

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'quick-order', QUICK_ORDER_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много заявок. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  try {
    const raw = await request.json()
    const parsed = quickOrderSchema.safeParse(raw)
    if (!parsed.success) {
      const firstErrors = parsed.error.flatten().fieldErrors
      const message = Object.values(firstErrors)[0]?.[0] ?? 'Некорректные данные формы'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const result = parsed.data
    await quickOrderService.createQuickOrder({
      productId: result.productId,
      quantity: result.quantity,
      name: result.name?.trim() ? result.name.trim() : undefined,
      phone: result.phone,
      comment: result.comment?.trim() ? result.comment.trim() : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Quick order create error:', error)
    return NextResponse.json({ error: 'Не удалось отправить заявку' }, { status: 500 })
  }
}
