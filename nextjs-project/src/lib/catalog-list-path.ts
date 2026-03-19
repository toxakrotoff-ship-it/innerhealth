export interface ParsedCatalogSearch {
  page: number
  q: string
  minPrice?: number
  maxPrice?: number
  brands: string[]
  promoOnly: boolean
  sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc'
  view: 'grid' | 'list'
}

export function parseCatalogSearchParams(sp: {
  page?: string
  q?: string
  minPrice?: string
  maxPrice?: string
  brand?: string
  promo?: string
  sort?: string
  view?: string
}): ParsedCatalogSearch {
  const q = sp.q?.trim() ?? ''
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined
  const promoOnly = sp.promo === '1'
  const brands = (sp.brand ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const sort =
    sp.sort === 'price_asc' || sp.sort === 'price_desc' || sp.sort === 'name_asc' ? sp.sort : 'newest'
  const view = sp.view === 'list' ? 'list' : 'grid'
  const page = Math.max(1, parseInt(String(sp.page), 10) || 1)
  return {
    page,
    q,
    minPrice: minPrice != null && !Number.isNaN(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice != null && !Number.isNaN(maxPrice) ? maxPrice : undefined,
    brands,
    promoOnly,
    sort,
    view,
  }
}

/**
 * Stable catalog URL path (path + query) for canonical URLs and BreadcrumbList @id.
 */
export function buildCatalogListPath(input: {
  page?: number
  q?: string
  minPrice?: number
  maxPrice?: number
  brands?: string[]
  promoOnly?: boolean
  sort?: ParsedCatalogSearch['sort']
  view?: ParsedCatalogSearch['view']
}): string {
  const params = new URLSearchParams()
  const page = input.page != null && input.page > 1 ? input.page : undefined
  if (page != null) params.set('page', String(page))
  const q = input.q?.trim()
  if (q) params.set('q', q)
  if (input.minPrice != null && !Number.isNaN(input.minPrice)) params.set('minPrice', String(input.minPrice))
  if (input.maxPrice != null && !Number.isNaN(input.maxPrice)) params.set('maxPrice', String(input.maxPrice))
  if (input.brands && input.brands.length > 0) params.set('brand', input.brands.join(','))
  if (input.promoOnly) params.set('promo', '1')
  if (input.sort && input.sort !== 'newest') params.set('sort', input.sort)
  if (input.view && input.view !== 'grid') params.set('view', input.view)
  const qs = params.toString()
  return qs ? `/catalog?${qs}` : '/catalog'
}
