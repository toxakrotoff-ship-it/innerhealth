import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as tildaLeadsService from '@/services/tilda-leads.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  try {
    const leads = await tildaLeadsService.getTildaLeads(brandId)
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin tilda-leads list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки с Тильды' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })
    }

    const isCsv = file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv')
    if (!isCsv) {
      return NextResponse.json({ error: 'Поддерживаются только CSV-файлы' }, { status: 400 })
    }

    const csvText = await file.text()
    const result = await tildaLeadsService.importTildaLeadsFromCsv(csvText, brandId)
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    console.error('Admin tilda-leads import error:', e)
    return NextResponse.json(
      { error: 'Не удалось импортировать заявки с Тильды' },
      { status: 500 }
    )
  }
}
