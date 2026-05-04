import type { ReactNode } from 'react'
import type { BrandId } from '@/lib/brand/brand'
import { getResolvedBlock } from '@/services/content-block.service'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { hasRenderableLegalRichBody } from '@/lib/legal/has-renderable-legal-rich-body'

export interface LegalPageRichOrStaticProps {
  page: string
  blockKey: string
  brandId: BrandId
  children: ReactNode
}

/**
 * Юридический/длинный текст: при заполненном rich-блоке в content blocks — рендер из БД, иначе `children` (кодовый fallback).
 */
export async function LegalPageRichOrStatic({
  page,
  blockKey,
  brandId,
  children,
}: LegalPageRichOrStaticProps): Promise<ReactNode> {
  const block = await getResolvedBlock(page, blockKey, brandId)
  if (block?.richJson && hasRenderableLegalRichBody(block.richJson)) {
    return (
      <TipTapDocRenderer raw={block.richJson} className="space-y-10 text-gray-700 leading-relaxed" />
    )
  }
  return <>{children}</>
}
