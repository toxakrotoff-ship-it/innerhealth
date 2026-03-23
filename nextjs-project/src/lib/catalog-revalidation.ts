export function buildCatalogRevalidationPaths(categorySlugs: readonly string[]): string[] {
  const basePaths = ['/', '/catalog']
  const normalizedCategoryPaths = Array.from(
    new Set(
      categorySlugs
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0)
        .map((slug) => `/catalog/${slug}`)
    )
  )

  return [...basePaths, ...normalizedCategoryPaths]
}
