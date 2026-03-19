import Link from 'next/link'

interface ProductRelatedCategoryLinkItem {
  id: string
  title: string
  slug: string | null
  brand: string | null
}

interface ProductRelatedCategoryLinksProps {
  /** Primary category name for visible context (SEO + users). */
  categoryTitle: string
  items: ProductRelatedCategoryLinkItem[]
}

/**
 * Crawler-visible internal links with descriptive anchor text (not only card thumbnails).
 */
export function ProductRelatedCategoryLinks({
  categoryTitle,
  items,
}: ProductRelatedCategoryLinksProps) {
  const linked = items.filter((item): item is typeof item & { slug: string } => Boolean(item.slug))
  if (linked.length === 0) return null

  return (
    <nav
      aria-label={`Похожие товары: ${categoryTitle}`}
      className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40"
    >
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        В разделе «{categoryTitle}» также смотрят:
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {linked.map((item) => {
          const anchor = item.brand?.trim()
            ? `${item.title} (${item.brand.trim()})`
            : item.title
          return (
            <li key={item.id}>
              <Link
                href={`/product/${item.slug}`}
                className="font-medium text-action-blue hover:underline underline-offset-2"
              >
                {anchor}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
