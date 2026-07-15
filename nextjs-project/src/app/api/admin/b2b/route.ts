import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as b2bService from '@/services/b2b.service'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const leads = await b2bService.getB2bLeads(brandId)
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin B2B list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки' },
      { status: 500 }
    )
  }
}
