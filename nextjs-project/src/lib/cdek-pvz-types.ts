export interface CdekPvzManifest {
  schemaVersion: 1
  publishedAt: string
  regions: Record<string, {
    path: string
    totalCount: number
    updatedAt: string
    isStale: boolean
  }>
}
