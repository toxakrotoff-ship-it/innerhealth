import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const mocks = vi.hoisted(() => ({ root: '', rows: vi.fn(), mapKey: vi.fn() }))
vi.mock('@/services/settings.service', () => ({ getYandexMapsApiKey: mocks.mapKey }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/project-root', () => ({ getProjectRoot: () => mocks.root }))
vi.mock('@/lib/prisma', () => ({ prisma: { ozonDeliveryPointCache: { findMany: mocks.rows } } }))
import { publishOzonPvzCities, readOzonPvzCityManifest, readOzonPvzSnapshot } from './ozon-pvz-publication'
import { normalizeOzonPvzCity, ozonPvzAddressCities } from './ozon-pvz-city'
import { GET as manifestRoute } from '@/app/api/ozon-pvz/manifest/route'
import { GET as snapshotRoute } from '@/app/api/ozon-pvz/cities/[brand]/[version]/[city]/route'

const row = (id = '123', city = 'Москва', name = 'Ozon') => ({ pointId: id, name, address: `Россия, ${city}, улица Тестовая, 1`, syncedAt: new Date() })
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
function params(snapshotPath: string) {
  const parts = snapshotPath.split('/')
  return { brand: parts.at(-3)!, version: parts.at(-2)!, city: parts.at(-1)! }
}
beforeEach(async () => {
  mocks.root = await fs.mkdtemp(path.join(os.tmpdir(), 'ozon-publication-'))
  mocks.rows.mockReset().mockResolvedValue([row()])
  mocks.mapKey.mockReset().mockResolvedValue(undefined)
})
afterEach(async () => {
  vi.restoreAllMocks(); vi.useRealTimers()
  await fs.rm(mocks.root, { recursive: true, force: true })
})

describe('Ozon public city publication', () => {
  it('publishes coordinates with the snapshot and supplies the current storefront map key through the uncached manifest', async () => {
    mocks.rows.mockResolvedValue([{ ...row(), latitude: 55.75, longitude: 37.61 }])
    await publishOzonPvzCities('inner')
    const pointer = await readOzonPvzCityManifest('inner', 'Москва')
    const p = params(pointer.entry!.path)
    expect(JSON.parse((await readOzonPvzSnapshot(p.brand, p.version, p.city))!)[0].coordinates).toEqual({ latitude: 55.75, longitude: 37.61 })
    mocks.mapKey.mockResolvedValue('storefront-map-key')
    const response = await manifestRoute(new Request('http://localhost/api/ozon-pvz/manifest?city=Москва&brand=inner'))
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ mapApiKey: 'storefront-map-key' })
    expect(mocks.mapKey).toHaveBeenCalledWith({ brandId: 'inner' })
    expect(pointer).not.toHaveProperty('mapApiKey')
  })
  it('publishes exact UTF-8 hashed public data and returns only the requested city pointer', async () => {
    await publishOzonPvzCities('inner', { expectedCount: 1 })
    const pointer = await readOzonPvzCityManifest('inner', 'г.Москва')
    expect(pointer.city).toBe('москва')
    expect(pointer.cityKey).toBe(hash('москва'))
    expect(pointer.entry?.totalCount).toBe(1)
    const p = params(pointer.entry!.path)
    const text = (await readOzonPvzSnapshot(p.brand, p.version, p.city))!
    expect(p.version).toBe(hash(text))
    expect(JSON.parse(text)).toEqual([{ id: 123, name: 'Ozon', address: 'Россия, Москва, улица Тестовая, 1' }])
    expect(text).not.toContain('syncedAt')
    expect(pointer).not.toHaveProperty('cities')
    expect((await readOzonPvzCityManifest('inner', 'Казань')).entry).toBeNull()
  })
  it('normalizes spelling and locality prefixes and avoids country/street snapshots', () => {
    expect(normalizeOzonPvzCity(' г.  Королёв ')).toBe('королев')
    expect(normalizeOzonPvzCity('СПб')).toBe('санкт-петербург')
    expect(ozonPvzAddressCities('Россия, Московская Область, пос. Мирный, улица Мира, 1')).toEqual(['мирный'])
    expect(ozonPvzAddressCities('Россия, Московская, Королёв, улица Гагарина, 1')).toContain('королев')
    expect(ozonPvzAddressCities('Россия, область Москва, Казань, улица Москва, 1')).toEqual(['казань'])
    expect(ozonPvzAddressCities('Россия, Москва, 50 лет Победы, 1')).toEqual(['москва'])
  })
  it('switches immediately to changed data while retaining previous immutable files', async () => {
    await publishOzonPvzCities('inner')
    const first = await readOzonPvzCityManifest('inner', 'Москва')
    mocks.rows.mockResolvedValue([row('456')])
    await publishOzonPvzCities('inner')
    const next = await readOzonPvzCityManifest('inner', 'Москва')
    expect(next.entry!.path).not.toBe(first.entry!.path)
    const old = params(first.entry!.path)
    expect(JSON.parse((await readOzonPvzSnapshot(old.brand, old.version, old.city))!)[0].id).toBe(123)
  })
  it('reuses the URL for unchanged public data even when sync timestamps change', async () => {
    await publishOzonPvzCities('inner')
    const first = await readOzonPvzCityManifest('inner', 'Москва')
    mocks.rows.mockResolvedValue([row()])
    await publishOzonPvzCities('inner')
    expect((await readOzonPvzCityManifest('inner', 'Москва')).entry!.path).toBe(first.entry!.path)
  })
  it('isolates storefront snapshots and pointers', async () => {
    await publishOzonPvzCities('inner')
    mocks.rows.mockResolvedValue([row('456')])
    await publishOzonPvzCities('sprint-power')
    const inner = await readOzonPvzCityManifest('inner', 'Москва')
    const sprint = await readOzonPvzCityManifest('sprint-power', 'Москва')
    expect(inner.entry!.path).toContain('/inner/')
    expect(sprint.entry!.path).toContain('/sprint-power/')
    const p = params(inner.entry!.path)
    expect(await readOzonPvzSnapshot('sprint-power', p.version, p.city)).toBeNull()
  })
  it('keeps the last complete pointer on incomplete, stale or invalid cache input', async () => {
    await publishOzonPvzCities('inner')
    const first = await readOzonPvzCityManifest('inner', 'Москва')
    await expect(publishOzonPvzCities('inner', { expectedCount: 2 })).rejects.toThrow('Incomplete')
    mocks.rows.mockResolvedValue([{ ...row(), syncedAt: new Date(Date.now() - 49 * 3600_000) }])
    await expect(publishOzonPvzCities('inner')).rejects.toThrow('Invalid')
    mocks.rows.mockResolvedValue([row('9007199254740992')])
    await expect(publishOzonPvzCities('inner')).rejects.toThrow('Invalid')
    mocks.rows.mockResolvedValue([])
    await expect(publishOzonPvzCities('inner')).rejects.toThrow('No Ozon')
    expect(await readOzonPvzCityManifest('inner', 'Москва')).toEqual(first)
  })
  it('does not switch the pointer if the final atomic rename fails', async () => {
    await publishOzonPvzCities('inner')
    const first = await readOzonPvzCityManifest('inner', 'Москва')
    const rename = fs.rename.bind(fs)
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(to).endsWith('manifest.json')) throw new Error('disk full')
      return rename(from, to)
    })
    mocks.rows.mockResolvedValue([row('456')])
    await expect(publishOzonPvzCities('inner')).rejects.toThrow('disk full')
    expect(await readOzonPvzCityManifest('inner', 'Москва')).toEqual(first)
    const files = await fs.readdir(path.join(mocks.root, 'public/uploads/ozon-pvz/inner'), { recursive: true })
    expect(files.some(file => file.endsWith('.tmp'))).toBe(false)
  })
  it('retires pointers for removed cities after a successful explicit empty synchronization', async () => {
    await publishOzonPvzCities('inner')
    mocks.rows.mockResolvedValue([])
    await publishOzonPvzCities('inner', { expectedCount: 0 })
    expect((await readOzonPvzCityManifest('inner', 'Москва')).entry).toBeNull()
  })
  it('does not direct clients to a snapshot older than the 48-hour cache window', async () => {
    await publishOzonPvzCities('inner')
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 49 * 3600_000)
    expect((await readOzonPvzCityManifest('inner', 'Москва')).entry).toBeNull()
  })
  it('rejects invalid storefronts, traversal and missing immutable files', async () => {
    expect(await readOzonPvzSnapshot('../inner', 'a'.repeat(64), `${'b'.repeat(64)}.json`)).toBeNull()
    expect(await readOzonPvzSnapshot('inner', '../manifest', 'city.json')).toBeNull()
    expect(await readOzonPvzSnapshot('inner', 'a'.repeat(64), '../manifest.json')).toBeNull()
    expect(await readOzonPvzSnapshot('inner', 'a'.repeat(64), `${'b'.repeat(64)}.json`)).toBeNull()
  })
})

describe('Ozon CDN HTTP policy', () => {
  it('never caches the pointer or pointer errors', async () => {
    const request = new Request('http://localhost/api/ozon-pvz/manifest?city=Москва&brand=inner')
    expect((await manifestRoute(request)).status).toBe(503)
    await publishOzonPvzCities('inner')
    const available = await manifestRoute(request)
    expect(available.status).toBe(200)
    expect(available.headers.get('cache-control')).toBe('no-store')
    expect((await available.json()).entry.totalCount).toBe(1)
    expect((await manifestRoute(new Request('http://localhost/api/ozon-pvz/manifest'))).status).toBe(400)
  })
  it('serves complete snapshots with immutable cache and CORS, errors with no-store', async () => {
    await publishOzonPvzCities('inner')
    const pointer = await readOzonPvzCityManifest('inner', 'Москва')
    const response = await snapshotRoute(new Request('http://localhost'), { params: Promise.resolve(params(pointer.entry!.path)) })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    const missing = await snapshotRoute(new Request('http://localhost'), { params: Promise.resolve({ brand: 'inner', version: 'a'.repeat(64), city: `${'b'.repeat(64)}.json` }) })
    expect(missing.status).toBe(404)
    expect(missing.headers.get('cache-control')).toBe('no-store')
  })
})
