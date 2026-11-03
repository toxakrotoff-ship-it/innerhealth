import type { BrandId } from '@/lib/brand/brand'
import { fetchCdekPvzManifest, fetchCdekPvzRegion } from '@/lib/cdek-pvz-client'
import { OFFICES_PAGE_SIZE } from '@/lib/cdek-widget-offices'

/** Load only the searched region, so changing cities stays safe on mobile maps. */
export async function fetchWidgetRegionOffices(params: {
  brandId?: BrandId
  regionCode: number
  signal: AbortSignal
}): Promise<unknown[]> {
  const manifest = await fetchCdekPvzManifest(params.signal)
  params.signal.throwIfAborted()
  if (manifest) {
    try {
      return await fetchCdekPvzRegion(manifest, params.regionCode, params.signal)
    } catch {
      params.signal.throwIfAborted()
      // Unpublished regions and CDN failures use the same regional API as bootstrap.
    }
  }

  const serviceUrl = new URLSearchParams()
  if (params.brandId) serviceUrl.set('brand', params.brandId)
  const offices: unknown[] = []
  for (let page = 0; ; page += 1) {
    const controller = new AbortController()
    const abort = () => controller.abort()
    params.signal.throwIfAborted()
    params.signal.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 25_000)
    try {
      const response = await fetch(`/api/cdek-widget/service?${serviceUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offices',
          widget_offices_scope: 'region',
          region_code: params.regionCode,
          is_handout: true,
          page,
          size: OFFICES_PAGE_SIZE,
        }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`CDEK region offices failed: ${response.status}`)
      const batch: unknown = await response.json()
      if (!Array.isArray(batch)) throw new Error('Invalid CDEK region offices response')
      offices.push(...batch)
      if (batch.length < OFFICES_PAGE_SIZE) return offices
    } finally {
      clearTimeout(timeout)
      params.signal.removeEventListener('abort', abort)
    }
  }
}
