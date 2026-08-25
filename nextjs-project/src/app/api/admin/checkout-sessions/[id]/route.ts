import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { findSessionForAdmin } from '@/services/checkout-session.service'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brand = resolveAdminBrandFromRequest(request)
  const { id } = await params

  try {
    const checkoutSession = await findSessionForAdmin(id, brand)
    if (!checkoutSession) {
      // 404, не 403 — не подтверждаем существование чужой/несуществующей записи.
      return NextResponse.json(
        { error: 'Сессия не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    return NextResponse.json(checkoutSession, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin/checkout-sessions/:id] Failed to load session:', error)
    return NextResponse.json(
      { error: 'Не удалось загрузить сессию' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
