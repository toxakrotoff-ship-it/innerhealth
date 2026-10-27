import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { getOzonDeliveryConfig } from '@/lib/ozon-delivery/config'
import { ozonErrorResponse, ozonRateLimit } from '@/lib/ozon-delivery/http'
import { OzonCheckoutError } from '@/lib/ozon-delivery/parcel'
import { ozonCityAddressPattern } from '@/lib/ozon-delivery/city'

export async function GET(request: Request) {
  const limited = await ozonRateLimit(request)
  if (limited) return limited
  const params = new URL(request.url).searchParams
  const parsed = z.object({
    city: z.string().trim().min(2).max(100).optional(),
    query: z.string().trim().max(100).optional(),
  }).refine(value => Boolean(value.city) || (value.query?.length ?? 0) >= 2).safeParse({
    city: params.get('city') ?? undefined, query: params.get('query') ?? undefined,
  })
  if (!parsed.success) return NextResponse.json({ error: 'Укажите город доставки (от 2 до 100 символов)' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  try {
    const brand = resolveBrandOrDefaultFromRequest(request)
    if (!await getOzonDeliveryConfig(brand)) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
    const conditions = [Prisma.sql`"brand" = ${brand}`, Prisma.sql`"syncedAt" >= ${new Date(Date.now() - 48 * 3600000)}`]
    if (parsed.data.city) conditions.push(Prisma.sql`address ~* ${ozonCityAddressPattern(parsed.data.city)}`)
    for (const word of (parsed.data.query || '').split(/\s+/).filter(Boolean)) {
      const escaped = word.replace(/[\\%_]/g, '\\$&')
      conditions.push(Prisma.sql`address ILIKE ${`%${escaped}%`}`)
    }
    const points = await prisma.$queryRaw<Array<{ pointId: string; name: string; address: string }>>(Prisma.sql`
      SELECT "pointId", name, address FROM "OzonDeliveryPointCache"
      WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY address, "pointId" LIMIT 31
    `)
    return NextResponse.json({ points: points.slice(0, 30).map(p => ({ id: Number(p.pointId), name: p.name, address: p.address })), hasMore: points.length > 30 }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonErrorResponse(error) }
}
