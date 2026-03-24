import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as partnershipService from '@/services/partnership.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  try {
    const leads = await partnershipService.getPartnershipLeads(brandId)
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin partnership list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки' },
      { status: 500 }
    )
  }
}
