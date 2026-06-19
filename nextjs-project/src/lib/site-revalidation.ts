import { revalidatePath } from 'next/cache'

export type StorefrontRevalidateScope = 'page' | 'layout'

/**
 * Bust Next.js Full Route Cache for a storefront path.
 * Layout scope also refreshes nested routes (e.g. all `/catalog/*` after catalog edits).
 */
export function revalidateStorefrontPath(
  path: string,
  scope: StorefrontRevalidateScope = 'layout'
): void {
  revalidatePath(path, scope)
}

export function revalidateStorefrontPaths(paths: readonly string[]): void {
  const uniquePaths = Array.from(
    new Set(paths.map((path) => path.trim()).filter((path) => path.length > 0))
  )

  for (const path of uniquePaths) {
    revalidateStorefrontPath(path, 'layout')
  }
}

/** Admin content-block `page` id → storefront URL paths that render those blocks. */
export const CONTENT_BLOCK_PAGE_PATHS: Readonly<Record<string, readonly string[]>> = {
  home: ['/', '/catalog'],
  about: ['/o-nas'],
  catalog: ['/catalog'],
  cart: ['/cart'],
  faq: ['/faq'],
  contacts: ['/contacts'],
  certificates: ['/sertifikaty-sootvetstviya'],
  sotrudnichestvo: ['/sotrudnichestvo'],
  'legal-privacy': ['/privacy'],
  'legal-oferta': ['/oferta'],
  footer: ['/'],
}

/** Force-refresh storefront pages after admin content-block save. */
export function revalidateContentBlockPage(page: string): void {
  const paths = CONTENT_BLOCK_PAGE_PATHS[page]
  if (!paths) {
    revalidateStorefrontPath('/', 'layout')
    return
  }

  revalidateStorefrontPaths(paths)
}
