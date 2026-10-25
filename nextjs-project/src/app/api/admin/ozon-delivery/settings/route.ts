import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/require-admin'
import { readOzonSettings, publicOzonSettings, saveOzonSettings } from '@/lib/ozon-delivery/settings'
import { ozonAdminBrand, ozonAdminErrorResponse } from '@/lib/ozon-delivery/admin'

const settingsSchema = z.object({
  ozon_enabled: z.enum(['0', '1']).optional(),
  ozon_client_id: z.string().trim().max(500).optional(),
  ozon_client_secret: z.string().trim().max(2000).optional(),
  ozon_shipment_method_id: z.string().trim().refine(value => !value || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0), 'Укажите положительный ID метода доставки').optional(),
  ozon_handling_hours: z.string().trim().refine(value => !value || (Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 168), 'Срок передачи заказа должен быть от 1 до 168 часов').optional(),
}).strict()
const putSchema = z.object({ settings: settingsSchema, applyToBoth: z.boolean().optional() }).strict()

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  try {
    return NextResponse.json(publicOzonSettings(await readOzonSettings(ozonAdminBrand(request))), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonAdminErrorResponse(error) }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  let raw: unknown
  try { raw = await request.json() } catch { return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 }) }
  const parsed = putSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Проверьте настройки Ozon' }, { status: 400 })
  try {
    return NextResponse.json(await saveOzonSettings(parsed.data.settings, ozonAdminBrand(request), parsed.data.applyToBoth), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonAdminErrorResponse(error) }
}
