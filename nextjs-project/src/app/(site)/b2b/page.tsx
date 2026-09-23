import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { B2bForm } from '@/components/site/b2b-form'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { buildContentPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const { brandId, siteTitle } = await getServerBrandContext()
  return buildContentPageMetadata({
    brandId,
    page: 'b2b',
    path: '/b2b',
    fallbackTitle: isSprintPowerBrand(brandId) ? 'B2B' : 'Оптовым партнёрам',
    fallbackDescription: `Оптовые поставки продукции ${siteTitle}. Оставьте заявку на получение оптового прайс-листа.`,
  })
}

export const revalidate = 86400

function getText(
  blocks: Array<{ key: string; text: string | null }>,
  key: string,
  fallback: string
): string {
  const value = blocks.find((b) => b.key === key)?.text
  return value != null ? value.trim() : fallback
}

export default async function B2bPage() {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const blocks = await getResolvedBlocksForPage('b2b', brandId)
  const bodyBlock = blocks.find((b) => b.key === 'b2b.body')

  const menuLabel = isSprintTheme ? 'B2B' : 'Оптовым партнёрам'
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: menuLabel },
  ]

  const pageTitle = getText(blocks, 'b2b.title', menuLabel)
  const formTitle = getText(blocks, 'b2b.form.title', 'Заявка на оптовый прайс-лист')
  const formSubtitle = getText(
    blocks,
    'b2b.form.subtitle',
    'Заполните форму — мы отправим вам оптовый прайс-лист и свяжемся для обсуждения условий.'
  )
  const successMessage = getText(
    blocks,
    'b2b.form.successMessage',
    'Спасибо, с вами в ближайшее время свяжется наш специалист.'
  )

  return (
    <div className={isSprintTheme ? 'min-h-screen bg-[#060A14] text-slate-100' : 'min-h-screen bg-white'}>
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} isInverted={isSprintTheme} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <header className="mb-10">
          <h1 className={`mb-4 text-3xl font-bold sm:text-4xl ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
            {pageTitle}
          </h1>
        </header>

        <div
          className={`max-w-none mb-14 leading-snug [&_.tiptap-block-text]:mb-2 [&_h2.tiptap-block-text]:mt-5 [&_h2.tiptap-block-text]:mb-2 [&_h3.tiptap-block-text]:mt-4 [&_h3.tiptap-block-text]:mb-1.5 [&_h4.tiptap-block-text]:mt-3 [&_h4.tiptap-block-text]:mb-1 ${
            isSprintTheme ? 'text-slate-300' : 'prose prose-gray text-gray-700'
          }`}
        >
          <TipTapDocRenderer
            raw={bodyBlock?.richJson}
            tone={isSprintTheme ? 'dark' : 'light'}
            className={
              isSprintTheme
                ? 'prose-invert text-slate-300 [&_p]:text-slate-300 [&_strong]:text-slate-100 prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline'
                : 'text-gray-700'
            }
          />
        </div>

        <section className={`border-t pt-10 ${isSprintTheme ? 'border-slate-800' : 'border-gray-200'}`}>
          <h2 className={`mb-2 text-2xl font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
            {formTitle}
          </h2>
          <p className={`mb-8 ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
            {formSubtitle}
          </p>
          <div
            className={`max-w-xl rounded-2xl border p-6 shadow-sm sm:p-8 ${
              isSprintTheme
                ? 'border-slate-800 bg-[#101828] shadow-[0_24px_80px_rgba(0,0,0,0.35)]'
                : 'border-gray-200 bg-white'
            }`}
          >
            <B2bForm isSprintTheme={isSprintTheme} successMessage={successMessage} />
          </div>
        </section>
      </AdaptiveContainer>
    </div>
  )
}
