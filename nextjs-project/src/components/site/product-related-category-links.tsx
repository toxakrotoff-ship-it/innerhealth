import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProductRelatedCategoryLinkItem {
  id: string
  title: string
  slug: string | null
  sku: string | null
}

interface ProductRelatedCategoryLinksProps {
  /** Primary category name for visible context (SEO + users). */
  categoryTitle: string
  items: ProductRelatedCategoryLinkItem[]
  /** Sprint Power / dark PDP — avoid light gray box + low-contrast pastel links. */
  isSprintTheme?: boolean
}

/**
 * Crawler-visible internal links with descriptive anchor text (not only card thumbnails).
 */
export function ProductRelatedCategoryLinks({
  categoryTitle,
  items,
  isSprintTheme = false,
}: ProductRelatedCategoryLinksProps) {
  const linked = items.filter((item): item is typeof item & { slug: string } => Boolean(item.slug))
  if (linked.length === 0) return null

  return (
    <nav
      aria-label={`Похожие товары: ${categoryTitle}`}
      className={cn(
        'mt-5 rounded-xl border px-4 py-3',
        isSprintTheme
          ? 'border-slate-700/80 bg-slate-900/90 shadow-[0_8px_24px_rgba(2,6,23,0.35)]'
          : 'border-gray-100 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40'
      )}
    >
      <p
        className={cn(
          'mb-2 text-sm',
          isSprintTheme ? 'text-slate-300' : 'text-gray-600 dark:text-gray-400'
        )}
      >
        В разделе «{categoryTitle}» также смотрят:
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {linked.map((item) => {
          const anchor = item.sku?.trim() ? `${item.title} (SKU: ${item.sku.trim()})` : item.title
          return (
            <li key={item.id}>
              <Link
                href={`/product/${item.slug}`}
                className={cn(
                  'font-medium underline-offset-2 hover:underline',
                  isSprintTheme
                    ? 'text-[#9AB8FF] hover:text-[#C8D6FF]'
                    : 'text-action-blue'
                )}
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
