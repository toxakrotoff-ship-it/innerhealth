import 'server-only'
import { setTimeout as delay } from 'node:timers/promises'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { getOzonDeliveryClient, OzonDeliveryError, OZON_DELIVERY_POINT_INFO_LIMIT } from './client'
import { getOzonDeliveryConfig } from './config'
import { publishOzonPvzCities } from '@/lib/ozon-pvz-publication'

/** Retry only directory reads; a temporary upstream response must not abort a 900-request refresh. */
async function readPoints<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await read() }
    catch (error) {
      const retryable = error instanceof OzonDeliveryError && (
        error.failure === 'network' || error.failure === 'timeout' ||
        (error.failure === 'http' && ([404, 408, 429].includes(error.status) || error.status >= 500))
      )
      if (!retryable || attempt >= 2) throw error
      await delay(500 * (attempt + 1))
    }
  }
}

/** Complete traversal before pruning. Failed/partial sync leaves the previous cache usable. */
export async function syncOzonDeliveryPoints(brand: BrandId, options: { includeDisabled?: boolean } = {}) {
  const config = await getOzonDeliveryConfig(brand, options)
  const client = await getOzonDeliveryClient(brand, options)
  if (!config || !client) return { brand, skipped: true, points: 0 }
  const started = new Date()
  const seen = new Set<string>()
  let cursor: string | undefined
  let points = 0
  for (let page = 0; page < 5000; page++) {
    const result = await readPoints(() => client.listDeliveryPoints(cursor))
    const ids = result.delivery_points.filter(point => {
      const methods = Array.isArray(point.shipment_method_ids) ? point.shipment_method_ids : [point.shipment_method_ids]
      return methods.includes(config.shipmentMethodId)
    }).map(point => point.delivery_point_id)
    for (let offset = 0; offset < ids.length; offset += OZON_DELIVERY_POINT_INFO_LIMIT) {
      const batch = ids.slice(offset, offset + OZON_DELIVERY_POINT_INFO_LIMIT)
      const info = await readPoints(() => client.getDeliveryPoints(batch))
      if (batch.some(id => !info.delivery_points.some(p => p.delivery_point_id === id))) throw new Error('Ozon returned an incomplete point page')
      const available = info.delivery_points.filter(p => p.is_active && p.type === 'pvz')
      if (available.length) {
        // One parameterized upsert per info batch avoids thousands of Prisma query plans.
        const records = JSON.stringify(available.map(p => ({
          pointId: String(p.delivery_point_id), name: p.name, address: p.full_address,
          latitude: p.coordinates?.latitude ?? null, longitude: p.coordinates?.longitude ?? null,
        })))
        await prisma.$executeRaw`
          INSERT INTO "OzonDeliveryPointCache" ("brand", "pointId", "name", "address", "syncedAt", "latitude", "longitude")
          SELECT ${brand}, point."pointId", point.name, point.address, ${new Date()}, point.latitude, point.longitude
          FROM jsonb_to_recordset(${records}::jsonb) AS point("pointId" text, name text, address text, latitude double precision, longitude double precision)
          ON CONFLICT ("brand", "pointId") DO UPDATE SET
            "name" = EXCLUDED."name", "address" = EXCLUDED."address", "syncedAt" = EXCLUDED."syncedAt",
            "latitude" = EXCLUDED."latitude", "longitude" = EXCLUDED."longitude"
        `
        points += available.length
      }
    }
    const next = result.next_cursor
    if (!next) {
      await prisma.ozonDeliveryPointCache.deleteMany({ where: { brand, syncedAt: { lt: started } } })
      // Keep quotes referenced by orders; unused quotes contain no contact details.
      await prisma.ozonDeliveryQuote.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) }, shipment: null } })
      await publishOzonPvzCities(brand, { syncedSince: started, expectedCount: points })
      return { brand, skipped: false, points }
    }
    if (seen.has(next)) throw new Error('Ozon repeated a pagination cursor')
    seen.add(next)
    cursor = next
  }
  throw new Error('Ozon point pagination limit exceeded')
}
