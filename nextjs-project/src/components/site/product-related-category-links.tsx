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
  /** Sprint Power / dark PDP uses slate styles; Inner Health keeps a fixed light panel (no `dark:`). */
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
        'mt-8 border-t pt-4 sm:mt-10',
        isSprintTheme ? 'border-slate-700' : 'border-gray-200'
      )}
    >
      <p
        className={cn(
          'mb-1.5 text-xs leading-snug',
          isSprintTheme ? 'text-slate-500' : 'text-gray-500'
        )}
      >
        Также в «{categoryTitle}»:
      </p>
      <ul className="flex flex-col gap-1 text-sm">
        {linked.map((item) => (
          <li key={item.id}>
            <Link
              href={`/product/${item.slug}`}
              className={cn(
                'underline-offset-2 hover:underline',
                isSprintTheme
                  ? 'text-slate-300 hover:text-[#9AB8FF]'
                  : 'text-gray-700 hover:text-action-blue'
              )}
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
