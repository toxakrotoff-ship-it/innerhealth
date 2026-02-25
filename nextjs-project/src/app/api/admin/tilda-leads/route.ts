import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as tildaLeadsService from '@/services/tilda-leads.service'

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const leads = await tildaLeadsService.getTildaLeads()
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin tilda-leads list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки с Тильды' },
      { status: 500 }
    )
  }
}
