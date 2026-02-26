import { NextResponse } from 'next/server'
import * as quickOrderService from '@/services/quick-order.service'

export async function GET() {
  try {
    const orders = await quickOrderService.getQuickOrdersForAdmin()
    return NextResponse.json(orders)
  } catch (error) {
    console.error('Quick orders admin GET error:', error)
    return NextResponse.json({ error: 'Не удалось загрузить заявки' }, { status: 500 })
  }
}
