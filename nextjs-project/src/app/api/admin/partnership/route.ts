import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as partnershipService from '@/services/partnership.service'

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const leads = await partnershipService.getPartnershipLeads()
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin partnership list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки' },
      { status: 500 }
    )
  }
}
