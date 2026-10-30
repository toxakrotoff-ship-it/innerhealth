import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { getProjectRoot } from '@/lib/project-root'
import type { CdekPvzManifest } from '@/lib/cdek-pvz-types'

export const PVZ_IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'

// The uploads volume survives application deploys, including when media uses S3.
function publicationRoot(): string {
  return path.join(getProjectRoot(), 'public', 'uploads', 'cdek-pvz')
}

async function atomicWrite(filePath: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporaryPath, text, { encoding: 'utf8', flag: 'wx' })
    await fs.rename(temporaryPath, filePath)
  } finally {
    await fs.unlink(temporaryPath).catch(() => {})
  }
}

/** Publish all snapshots first, then atomically switch the uncached manifest. */
export async function publishCdekPvzRegions(regionCodes: number[]): Promise<CdekPvzManifest> {
  const rows = await prisma.cdekOfficeCache.findMany({
    where: { regionCode: { in: regionCodes } },
    orderBy: { regionCode: 'asc' },
    select: { regionCode: true, payload: true, totalCount: true, updatedAt: true, isStale: true },
  })
  if (rows.length === 0) throw new Error('No regional PVZ cache available for publication')
  const expectedRegions = new Set(regionCodes)
  if (rows.length !== expectedRegions.size || new Set(rows.map((row) => row.regionCode)).size !== expectedRegions.size ||
    rows.some((row) => !expectedRegions.has(row.regionCode))) {
    throw new Error('Incomplete regional PVZ cache; keeping the previous publication')
  }

  const manifest: CdekPvzManifest = {
    schemaVersion: 1,
    publishedAt: new Date().toISOString(),
    regions: {},
  }

  for (const row of rows) {
    if (!Number.isSafeInteger(row.regionCode) || row.regionCode <= 0 ||
      !Array.isArray(row.payload) || row.totalCount !== row.payload.length) {
      throw new Error('Invalid regional PVZ cache for publication')
    }
    const text = JSON.stringify(row.payload)
    const version = createHash('sha256').update(text).digest('hex')
    const relativePath = path.join('regions', version, `${row.regionCode}.json`)
    await atomicWrite(path.join(publicationRoot(), relativePath), text)
    manifest.regions[String(row.regionCode)] = {
      path: `/api/cdek-pvz/regions/${version}/${row.regionCode}.json`,
      totalCount: row.payload.length,
      updatedAt: row.updatedAt.toISOString(),
      isStale: row.isStale,
    }
  }

  await atomicWrite(path.join(publicationRoot(), 'manifest.json'), JSON.stringify(manifest))
  return manifest
}

export async function readCdekPvzManifest(): Promise<CdekPvzManifest> {
  return JSON.parse(await fs.readFile(path.join(publicationRoot(), 'manifest.json'), 'utf8'))
}

export async function readCdekPvzSnapshot(version: string, regionFile: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(version) || !/^[1-9]\d{0,8}\.json$/.test(regionFile)) return null
  try {
    return await fs.readFile(path.join(publicationRoot(), 'regions', version, regionFile), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}
