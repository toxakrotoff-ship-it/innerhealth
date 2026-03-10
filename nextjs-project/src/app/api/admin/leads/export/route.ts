import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { getAllLeadsForExport, buildLeadsCsv } from '@/services/leads-export.service'

export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const rows = await getAllLeadsForExport()
    const csv = buildLeadsCsv(rows)
    const date = new Date().toISOString().slice(0, 10)
    const filename = `leads-${date}.csv`
    const bom = '\uFEFF'
    return new NextResponse(bom + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('[admin/leads/export] Error:', e)
    return NextResponse.json(
      { error: 'Не удалось сформировать выгрузку лидов' },
      { status: 500 }
    )
  }
}
