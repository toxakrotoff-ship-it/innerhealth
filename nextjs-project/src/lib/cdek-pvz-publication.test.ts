import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const mocks = vi.hoisted(() => ({ root: '', findMany: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/project-root', () => ({ getProjectRoot: () => mocks.root }))
vi.mock('@/lib/prisma', () => ({ prisma: { cdekOfficeCache: { findMany: mocks.findMany } } }))

import { publishCdekPvzRegions, readCdekPvzManifest, readCdekPvzSnapshot } from './cdek-pvz-publication'
import { GET as getManifest } from '@/app/api/cdek-pvz/manifest/route'
import { GET as getSnapshot } from '@/app/api/cdek-pvz/regions/[version]/[region]/route'

function row(payload: unknown[] = [{ code: 'MSK1' }], regionCode = 81) {
  return { regionCode, payload, totalCount: payload.length, updatedAt: new Date('2026-10-27T00:00:00Z'), isStale: false }
}

function snapshotParams(snapshotPath: string) {
  const parts = snapshotPath.split('/')
  return { version: parts.at(-2)!, region: parts.at(-1)! }
}

beforeEach(async () => {
  mocks.root = await fs.mkdtemp(path.join(os.tmpdir(), 'cdek-pvz-test-'))
  mocks.findMany.mockResolvedValue([row()])
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(mocks.root, { recursive: true, force: true })
})

describe('regional PVZ publication', () => {
  it('switches the manifest only after publishing readable snapshots', async () => {
    const manifest = await publishCdekPvzRegions([81])
    expect(await readCdekPvzManifest()).toEqual(manifest)
    const { version, region } = snapshotParams(manifest.regions['81'].path)
    expect(JSON.parse((await readCdekPvzSnapshot(version, region))!)).toEqual([{ code: 'MSK1' }])
    expect(manifest.regions['81']).toMatchObject({ totalCount: 1, isStale: false })
  })

  it('changes the URL when data changes, while retaining previous immutable snapshots', async () => {
    const first = await publishCdekPvzRegions([81])
    mocks.findMany.mockResolvedValue([row([{ code: 'MSK2' }])])
    const second = await publishCdekPvzRegions([81])
    expect(second.regions['81'].path).not.toBe(first.regions['81'].path)
    const previous = snapshotParams(first.regions['81'].path)
    expect(JSON.parse((await readCdekPvzSnapshot(previous.version, previous.region))!)).toEqual([{ code: 'MSK1' }])
    expect((await readCdekPvzManifest()).regions).toEqual(second.regions)
  })

  it('reuses content URLs for unchanged payloads and preserves stale metadata', async () => {
    const first = await publishCdekPvzRegions([81])
    mocks.findMany.mockResolvedValue([{ ...row(), isStale: true, updatedAt: new Date() }])
    const next = await publishCdekPvzRegions([81])
    expect(next.regions['81'].path).toBe(first.regions['81'].path)
    expect(next.regions['81'].isStale).toBe(true)
  })

  it('retains the previous manifest if a later regional payload is invalid', async () => {
    const first = await publishCdekPvzRegions([81])
    mocks.findMany.mockResolvedValue([row([{ code: 'MSK2' }]), { ...row([], 82), totalCount: 2 }])
    await expect(publishCdekPvzRegions([81, 82])).rejects.toThrow('Invalid regional')
    expect(await readCdekPvzManifest()).toEqual(first)
  })

  it('retains the previous manifest if the final atomic switch fails', async () => {
    const first = await publishCdekPvzRegions([81])
    const rename = fs.rename.bind(fs)
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(to).endsWith('manifest.json')) throw new Error('disk full')
      return rename(from, to)
    })
    mocks.findMany.mockResolvedValue([row([{ code: 'MSK2' }])])
    await expect(publishCdekPvzRegions([81])).rejects.toThrow('disk full')
    expect(await readCdekPvzManifest()).toEqual(first)
    const files = await fs.readdir(path.join(mocks.root, 'public/uploads/cdek-pvz'))
    expect(files.some((name) => name.endsWith('.tmp'))).toBe(false)
  })

  it('does not replace an existing publication with an empty export', async () => {
    const first = await publishCdekPvzRegions([81])
    mocks.findMany.mockResolvedValue([])
    await expect(publishCdekPvzRegions([])).rejects.toThrow('No regional')
    expect(await readCdekPvzManifest()).toEqual(first)
  })

  it('retains the previous complete manifest if any enumerated region has no cached row', async () => {
    const first = await publishCdekPvzRegions([81])
    await expect(publishCdekPvzRegions([81, 82])).rejects.toThrow('Incomplete regional')
    expect(await readCdekPvzManifest()).toEqual(first)
  })

  it('rejects path traversal and missing snapshots', async () => {
    expect(await readCdekPvzSnapshot('../manifest', '81.json')).toBeNull()
    expect(await readCdekPvzSnapshot('a'.repeat(64), '../manifest.json')).toBeNull()
    expect(await readCdekPvzSnapshot('a'.repeat(64), '81.json')).toBeNull()
  })
})

describe('PVZ HTTP cache policy', () => {
  it('never caches the manifest, including unavailable responses', async () => {
    const unavailable = await getManifest()
    expect(unavailable.status).toBe(503)
    expect(unavailable.headers.get('cache-control')).toBe('no-store')
    await publishCdekPvzRegions([81])
    const available = await getManifest()
    expect(available.status).toBe(200)
    expect(available.headers.get('cache-control')).toBe('no-store')
  })

  it('caches successful snapshots immutably with CORS, without caching errors', async () => {
    const manifest = await publishCdekPvzRegions([81])
    const response = await getSnapshot(new Request('https://example.com'), {
      params: Promise.resolve(snapshotParams(manifest.regions['81'].path)),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    const missing = await getSnapshot(new Request('https://example.com'), {
      params: Promise.resolve({ version: 'a'.repeat(64), region: '81.json' }),
    })
    expect(missing.status).toBe(404)
    expect(missing.headers.get('cache-control')).toBe('no-store')
  })
})
