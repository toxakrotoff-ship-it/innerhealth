import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const leads = await prisma.tildaLead.findMany({
      orderBy: { tildaDate: 'desc' },
    })
    return NextResponse.json(leads)
  } catch (e) {
    console.error('Admin tilda-leads list error:', e)
    return NextResponse.json(
      { error: 'Не удалось загрузить заявки с Тильды' },
      { status: 500 }
    )
  }
}
