import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { getOzonDeliveryConfig } from '@/lib/ozon-delivery/config'
import { ozonErrorResponse, ozonRateLimit } from '@/lib/ozon-delivery/http'
import { OzonCheckoutError } from '@/lib/ozon-delivery/parcel'

export async function GET(request: Request) {
  const limited = await ozonRateLimit(request)
  if (limited) return limited
  const query = z.string().trim().min(2).max(100).safeParse(new URL(request.url).searchParams.get('query'))
  if (!query.success) return NextResponse.json({ error: 'Введите город или адрес (от 2 до 100 символов)' }, { status: 400 })
  try {
    const brand = resolveBrandOrDefaultFromRequest(request)
    if (!await getOzonDeliveryConfig(brand)) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
    const points = await prisma.ozonDeliveryPointCache.findMany({
      where: { brand, syncedAt: { gte: new Date(Date.now() - 48 * 3600000) }, AND: query.data.split(/\s+/).map(word => ({ address: { contains: word, mode: 'insensitive' as const } })) },
      orderBy: [{ address: 'asc' }, { pointId: 'asc' }], take: 30,
    })
    return NextResponse.json({ points: points.map(p => ({ id: Number(p.pointId), name: p.name, address: p.address })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonErrorResponse(error) }
}
