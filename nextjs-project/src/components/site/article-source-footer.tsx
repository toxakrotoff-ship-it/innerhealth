interface ArticleSourceFooterProps {
  canonicalUrl: string
  siteName?: string
}

/**
 * Visible citation block for humans and parsers (complements JSON-LD creditText).
 */
export function ArticleSourceFooter({
  canonicalUrl,
  siteName = 'Inner Health',
}: ArticleSourceFooterProps) {
  return (
    <footer className="mt-10 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p className="font-medium text-text mb-1">Источник</p>
      <p>
        <span className="text-gray-600">Материал {siteName}. Ссылка для цитирования: </span>
        <a href={canonicalUrl} className="text-action-blue break-all underline-offset-2 hover:underline">
          {canonicalUrl}
        </a>
      </p>
    </footer>
  )
}
