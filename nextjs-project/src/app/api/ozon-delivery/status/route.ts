import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { getOzonDeliveryConfig } from '@/lib/ozon-delivery/config'

export async function GET(request: Request) {
  let enabled = false
  try {
    const brand = resolveBrandOrDefaultFromRequest(request)
    if (await getOzonDeliveryConfig(brand)) {
      enabled = Boolean(await prisma.ozonDeliveryPointCache.findFirst({ where: { brand, syncedAt: { gte: new Date(Date.now() - 48 * 3600000) } }, select: { pointId: true } }))
    }
  } catch { /* Incomplete setup must not interrupt the existing checkout. */ }
  return NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } })
}
