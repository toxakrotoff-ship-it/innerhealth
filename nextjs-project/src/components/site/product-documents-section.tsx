import { cn } from '@/lib/utils'
import { formatDocumentDate, formatDocumentFileSize } from '@/lib/product-documents'

export interface ProductDocumentSectionItem {
  id: string
  title: string
  typeLabel: string
  fileUrl: string
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  documentNumber?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
}

interface ProductDocumentsSectionProps {
  documents: ProductDocumentSectionItem[]
  isSprintTheme?: boolean
  className?: string
}

export function ProductDocumentsSection({
  documents,
  isSprintTheme = false,
  className,
}: ProductDocumentsSectionProps) {
  if (documents.length === 0) return null

  return (
    <section className={cn('border-t pt-5 sm:pt-6', isSprintTheme ? 'border-slate-700' : 'border-gray-200', className)}>
      <h2
        className={cn(
          'mb-3 text-base font-semibold tracking-tight sm:text-lg',
          isSprintTheme ? 'text-slate-100' : 'text-gray-900'
        )}
      >
        Документы
      </h2>
      <div className="space-y-2.5">
        {documents.map((document) => {
          const metaLines = [
            document.documentNumber ? `№ ${document.documentNumber}` : null,
            formatDocumentFileSize(document.fileSize),
          ].filter(Boolean)
          const issuedAt = formatDocumentDate(document.issuedAt)
          const expiresAt = formatDocumentDate(document.expiresAt)

          return (
            <article
              key={document.id}
              className={cn(
                'rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5',
                isSprintTheme
                  ? 'border-slate-700 bg-slate-900/35'
                  : 'border-gray-200 bg-white'
              )}
            >
              <p className={cn('text-[11px] font-semibold uppercase tracking-[0.12em]', isSprintTheme ? 'text-slate-400' : 'text-gray-500')}>
                {document.typeLabel}
              </p>
              <h3
                className={cn(
                  'mt-1.5 text-sm font-semibold break-words sm:text-[0.95rem]',
                  isSprintTheme ? 'text-slate-100' : 'text-gray-900'
                )}
              >
                {document.title}
              </h3>
              {metaLines.length > 0 && (
                <p className={cn('mt-1.5 text-xs', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
                  {metaLines.join(' • ')}
                </p>
              )}
              {(issuedAt || expiresAt) && (
                <div className={cn('mt-1.5 space-y-0.5 text-xs', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
                  {issuedAt && <p>Дата документа: {issuedAt}</p>}
                  {expiresAt && <p>Действует до: {expiresAt}</p>}
                </div>
              )}
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Открыть документ: ${document.title}`}
                className={cn(
                  'mt-3 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
                  isSprintTheme
                    ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]'
                    : 'bg-gray-900 text-white hover:bg-gray-700'
                )}
              >
                Открыть файл
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}
