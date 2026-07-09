import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as contactHelpService from '@/services/contact-help.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  try {
    const leads = await contactHelpService.getContactHelpLeads(brandId)
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin contact help list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки' },
      { status: 500 }
    )
  }
}
