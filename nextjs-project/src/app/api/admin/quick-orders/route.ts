import { NextResponse } from 'next/server'
import * as quickOrderService from '@/services/quick-order.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { requireAdminSession } from '@/lib/require-admin'

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)
  try {
    const orders = await quickOrderService.getQuickOrdersForAdmin(brandId)
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Quick orders admin GET error:', error)
    return NextResponse.json({ error: 'Не удалось загрузить заявки' }, { status: 500 })
  }
}
