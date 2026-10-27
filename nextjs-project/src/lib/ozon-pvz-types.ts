import type { BrandId } from '@/lib/brand/brand'

export interface OzonPublicPoint {
  id: number
  name: string
  address: string
  coordinates?: { latitude: number; longitude: number }
}

export interface OzonPvzCityEntry {
  path: string
  totalCount: number
  updatedAt: string
}

export interface OzonPvzCityManifest {
  schemaVersion: 1
  brand: BrandId
  publishedAt: string
  city: string
  cityKey: string
  entry: OzonPvzCityEntry | null
  mapApiKey?: string
}

export interface OzonPvzPublication {
  schemaVersion: 1
  brand: BrandId
  publishedAt: string
  cities: Record<string, OzonPvzCityEntry>
}
