import { NextResponse } from 'next/server'
import { z } from 'zod'
import { orderItemSchema } from '@/lib/validations/order'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { quoteOzonDelivery } from '@/lib/ozon-delivery/checkout'
import { ozonErrorResponse, ozonRateLimit } from '@/lib/ozon-delivery/http'

const schema = z.object({
  items: z.array(orderItemSchema).min(1).max(50), phone: z.string().min(1).max(30),
  deliveryPointId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  promoCodeId: z.string().max(100).nullish(),
})

export async function POST(request: Request) {
  const limited = await ozonRateLimit(request)
  if (limited) return limited
  let raw: unknown
  try { raw = await request.json() } catch { return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 }) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Проверьте состав корзины, телефон и пункт выдачи' }, { status: 400 })
  try {
    return NextResponse.json(await quoteOzonDelivery(parsed.data, resolveBrandOrDefaultFromRequest(request)), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonErrorResponse(error) }
}
