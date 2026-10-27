import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { getProjectRoot } from '@/lib/project-root'
import { isBrandId, type BrandId } from '@/lib/brand/brand'
import { normalizeOzonPvzCity, ozonPvzAddressCities } from './ozon-pvz-city'
import type { OzonPublicPoint, OzonPvzCityManifest, OzonPvzPublication } from './ozon-pvz-types'

export const OZON_PVZ_IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const MAX_AGE_MS = 48 * 3600_000
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const manifestCache = new Map<BrandId, { key: string; value: OzonPvzPublication }>()

function publicationRoot(brand: BrandId): string {
  if (!isBrandId(brand)) throw new Error('Invalid Ozon publication storefront')
  return path.join(getProjectRoot(), 'public', 'uploads', 'ozon-pvz', brand)
}

async function atomicWrite(filePath: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, text, { encoding: 'utf8', flag: 'wx' })
    await fs.rename(temporary, filePath)
  } finally { await fs.unlink(temporary).catch(() => {}) }
}

/** Publish complete city snapshots before atomically switching this storefront's pointer. */
export async function publishOzonPvzCities(brand: BrandId, options: { syncedSince?: Date; expectedCount?: number } = {}): Promise<OzonPvzPublication> {
  const root = publicationRoot(brand)
  const oldest = new Date(Date.now() - MAX_AGE_MS)
  const rows = await prisma.ozonDeliveryPointCache.findMany({
    where: { brand, syncedAt: { gte: options.syncedSince ?? oldest } },
    orderBy: [{ address: 'asc' }, { pointId: 'asc' }],
    select: { pointId: true, name: true, address: true, syncedAt: true, latitude: true, longitude: true },
  })
  if (options.expectedCount !== undefined && rows.length !== options.expectedCount) throw new Error('Incomplete Ozon cache publication')
  if (!rows.length && options.expectedCount !== 0) throw new Error('No Ozon cache available for publication')
  const groups = new Map<string, { points: OzonPublicPoint[]; updatedAt: number }>()
  const ids = new Set<string>()
  for (const row of rows) {
    const id = Number(row.pointId)
    const updatedAt = row.syncedAt.getTime()
    if (!Number.isSafeInteger(id) || id <= 0 || ids.has(row.pointId) || typeof row.name !== 'string' ||
      typeof row.address !== 'string' || !row.address.trim() || !Number.isFinite(updatedAt) || updatedAt < oldest.getTime()) {
      throw new Error('Invalid Ozon cache publication')
    }
    ids.add(row.pointId)
    const point: OzonPublicPoint = { id, name: row.name, address: row.address,
      ...(row.latitude != null && row.longitude != null ? { coordinates: { latitude: row.latitude, longitude: row.longitude } } : {}),
    }
    for (const city of ozonPvzAddressCities(row.address)) {
      const group = groups.get(city) ?? { points: [], updatedAt }
      group.points.push(point)
      group.updatedAt = Math.min(group.updatedAt, updatedAt)
      groups.set(city, group)
    }
  }
  if (rows.length && !groups.size) throw new Error('No Ozon cities available for publication')
  const manifest: OzonPvzPublication = { schemaVersion: 1, brand, publishedAt: new Date().toISOString(), cities: {} }
  for (const [city, group] of groups) {
    const cityKey = hash(city)
    const text = JSON.stringify(group.points)
    const version = hash(text)
    await atomicWrite(path.join(root, 'cities', version, `${cityKey}.json`), text)
    manifest.cities[cityKey] = {
      path: `/api/ozon-pvz/cities/${brand}/${version}/${cityKey}.json`,
      totalCount: group.points.length, updatedAt: new Date(group.updatedAt).toISOString(),
    }
  }
  await atomicWrite(path.join(root, 'manifest.json'), JSON.stringify(manifest))
  manifestCache.delete(brand)
  return manifest
}

export async function readOzonPvzCityManifest(brand: BrandId, city: string): Promise<OzonPvzCityManifest> {
  const file = path.join(publicationRoot(brand), 'manifest.json')
  const stat = await fs.stat(file)
  // Atomic rename changes the inode even for publications in the same millisecond.
  const key = `${file}:${stat.ino}:${stat.mtimeMs}:${stat.size}`
  let cached = manifestCache.get(brand)
  if (!cached || cached.key !== key) {
    const value = JSON.parse(await fs.readFile(file, 'utf8')) as OzonPvzPublication
    if (value.schemaVersion !== 1 || value.brand !== brand || !Number.isFinite(Date.parse(value.publishedAt)) ||
      !value.cities || typeof value.cities !== 'object' || Array.isArray(value.cities)) throw new Error('Invalid Ozon manifest')
    cached = { key, value }
    manifestCache.set(brand, cached)
  }
  const normalized = normalizeOzonPvzCity(city)
  const cityKey = hash(normalized)
  const entry = cached.value.cities[cityKey] ?? null
  const fresh = Date.parse(cached.value.publishedAt) >= Date.now() - MAX_AGE_MS &&
    entry && Date.parse(entry.updatedAt) >= Date.now() - MAX_AGE_MS
  return { schemaVersion: 1, brand, publishedAt: cached.value.publishedAt, city: normalized, cityKey, entry: fresh ? entry : null }
}

export async function readOzonPvzSnapshot(brand: string, version: string, cityFile: string): Promise<string | null> {
  if (!isBrandId(brand) || !/^[a-f0-9]{64}$/.test(version) || !/^[a-f0-9]{64}\.json$/.test(cityFile)) return null
  try { return await fs.readFile(path.join(publicationRoot(brand), 'cities', version, cityFile), 'utf8') }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}
