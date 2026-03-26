interface ProductImagePostprocessParams {
  surface: 'catalog-card' | 'gallery-main'
  mode?: string | null
}

interface ProductMediaBackdropParams {
  mode?: string | null
}

const DEFAULT_MODE = 'contain-safe'

function resolveMode(rawMode?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_PRODUCT_IMAGE_POSTPROCESS_MODE?.trim()
  const candidate = rawMode?.trim() || fromEnv || DEFAULT_MODE
  return candidate.toLowerCase()
}

function getCatalogCardClasses(mode: string): string {
  if (mode === 'cover-top') return 'object-cover object-top'
  if (mode === 'cover-crop-center') return 'object-cover object-center scale-105'
  return 'object-contain object-center'
}

function getGalleryMainClasses(mode: string): string {
  if (mode === 'cover-top') return 'object-cover object-top'
  if (mode === 'cover-crop-center') return 'object-cover object-center scale-105'
  return 'object-contain object-center'
}

export function getProductImagePostprocessClasses({
  surface,
  mode,
}: ProductImagePostprocessParams): string {
  const resolvedMode = resolveMode(mode)
  if (surface === 'catalog-card') return getCatalogCardClasses(resolvedMode)
  return getGalleryMainClasses(resolvedMode)
}

export function shouldShowProductMediaBackdrop({ mode }: ProductMediaBackdropParams): boolean {
  const resolvedMode = resolveMode(mode)
  return resolvedMode === 'contain-safe'
}
