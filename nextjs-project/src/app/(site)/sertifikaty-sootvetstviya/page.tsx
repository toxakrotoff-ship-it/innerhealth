import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { GalleryBlock } from '@/components/site/gallery-block'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import { buildContentPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const { brandId, siteTitle } = await getServerBrandContext()
  return buildContentPageMetadata({
    brandId,
    page: 'certificates',
    path: '/sertifikaty-sootvetstviya',
    fallbackTitle: 'Сертификаты соответствия',
    fallbackDescription: `Сертификаты соответствия и документы, подтверждающие качество и безопасность продукции ${siteTitle}. Декларации и сертификаты качества.`,
  })
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Сертификаты соответствия' },
]

export const revalidate = 86400

function getBlockText(
  blocks: ReadonlyArray<{ key: string; text: string | null }>,
  key: string,
  fallback: string
): string {
  return blocks.find((b) => b.key === key)?.text ?? fallback
}

export default async function CertificatesPage() {
  const { brandId, siteTitle } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const siteConfig = getBrandSiteConfig(brandId)
  const blocks = await getResolvedBlocksForPage('certificates', brandId)

  const title = getBlockText(blocks, 'certificates.title', 'Сертификаты соответствия')

  const aboutTitle = getBlockText(blocks, 'certificates.section.about.title', 'О документах')
  const aboutP1 = getBlockText(
    blocks,
    'certificates.section.about.p1',
    `${siteTitle} уделяет особое внимание качеству и безопасности продукции. Ниже представлены сертификаты соответствия, декларации о соответствии и иные документы, подтверждающие соответствие товаров действующим нормам и стандартам.`
  )
  const aboutP2 = getBlockText(
    blocks,
    'certificates.section.about.p2',
    'При необходимости вы можете запросить копии документов по электронной почте:'
  )

  const declarationsTitle = getBlockText(
    blocks,
    'certificates.section.declarations.title',
    'Декларации о соответствии ТР ТС'
  )
  const declarationsP1 = getBlockText(
    blocks,
    'certificates.section.declarations.p1',
    'Продукция, реализуемая в рамках Таможенного союза (ЕАЭС), сопровождается декларациями о соответствии техническим регламентам ТР ТС (например, ТР ТС 021/2011 «О безопасности пищевой продукции», ТР ТС 029/2012 и др.), где применимо.'
  )
  const declarationsNote = getBlockText(
    blocks,
    'certificates.section.declarations.note',
    'Декларации хранятся у продавца и предоставляются по запросу покупателя или контролирующих органов.'
  )

  const productCertificatesTitle = getBlockText(
    blocks,
    'certificates.section.productCertificates.title',
    'Сертификаты на продукцию'
  )
  const productCertificatesP1 = getBlockText(
    blocks,
    'certificates.section.productCertificates.p1',
    'Отдельные категории товаров могут иметь добровольную сертификацию или сертификаты соответствия по российским и международным стандартам (в том числе органическая продукция, при наличии).'
  )
  const productCertificatesNote = getBlockText(
    blocks,
    'certificates.section.productCertificates.note',
    'Актуальный перечень сертификатов и сканы документов будут размещены в этом разделе. По вопросам наличия сертификатов на конкретный товар обращайтесь в службу поддержки.'
  )

  const contactsTitle = getBlockText(blocks, 'certificates.section.contacts.title', 'Контакты')
  const contactsIntro = getBlockText(
    blocks,
    'certificates.section.contacts.intro',
    'По вопросам сертификатов и документов:'
  )
  const contactsEmail = getBlockText(
    blocks,
    'certificates.section.contacts.email',
    siteConfig.contact.email
  )
  const contactsPageLabel = getBlockText(blocks, 'certificates.section.contacts.contactsPageLabel', 'Контакты')

  const galleryImages = Array.from({ length: 12 }, (_, i) => i + 1)
    .map((i) => {
      const src = getBlockText(blocks, `certificates.gallery.image${i}.src`, '').trim()
      if (src.length === 0) return null
      const alt = getBlockText(blocks, `certificates.gallery.image${i}.alt`, `Сертификат ${i}`).trim()
      return { src, alt: alt.length > 0 ? alt : `Сертификат ${i}` }
    })
    .filter((img): img is { src: string; alt: string } => img != null)

  return (
    <div className={isSprintTheme ? 'min-h-screen bg-[#060A14] text-slate-100' : 'min-h-screen bg-white'}>
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} isInverted={isSprintTheme} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <article>
        <header className="mb-10">
          <h1 className={`text-3xl font-bold sm:text-4xl ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
            {title}
          </h1>
        </header>

        <div className={`prose max-w-none space-y-10 leading-relaxed ${isSprintTheme ? 'prose-invert text-slate-300' : 'prose-gray text-gray-700'}`}>
          <section className={`rounded-2xl border p-6 sm:p-8 ${isSprintTheme ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200 bg-soft-background/50'}`}>
            <h2 className={`mb-4 text-xl font-bold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {aboutTitle}
            </h2>
            <p className="mb-4">
              {aboutP1}
            </p>
            <p>
              {aboutP2}{' '}
              <a
                href={`mailto:${contactsEmail}`}
                className={isSprintTheme ? 'text-[#7AA2FF] hover:underline' : 'text-action-blue hover:underline'}
              >
                {contactsEmail}
              </a>
              .
            </p>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${isSprintTheme ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200'}`}>
            <h2 className={`mb-4 text-xl font-bold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {declarationsTitle}
            </h2>
            <p className="mb-4">
              {declarationsP1}
            </p>
            <p className={`text-sm ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
              {declarationsNote}
            </p>
          </section>

          <section className={`rounded-2xl border p-6 sm:p-8 ${isSprintTheme ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200'}`}>
            <h2 className={`mb-4 text-xl font-bold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {productCertificatesTitle}
            </h2>
            <p className="mb-4">
              {productCertificatesP1}
            </p>
            <p className={`text-sm ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
              {productCertificatesNote}
            </p>
          </section>

          <GalleryBlock images={galleryImages} />

          <section className={`rounded-2xl border p-6 sm:p-8 ${isSprintTheme ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200'}`}>
            <h2 className={`mb-4 text-xl font-bold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {contactsTitle}
            </h2>
            <p className="mb-2">
              {contactsIntro}
            </p>
            <ul className={`list-disc space-y-1 pl-6 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
              <li>
                Email:{' '}
                <a
                  href={`mailto:${contactsEmail}`}
                  className={isSprintTheme ? 'text-[#7AA2FF] hover:underline' : 'text-action-blue hover:underline'}
                >
                  {contactsEmail}
                </a>
              </li>
              <li>
                Раздел{' '}
                <Link href="/contacts" className={isSprintTheme ? 'text-[#7AA2FF] hover:underline' : 'text-action-blue hover:underline'}>
                  {contactsPageLabel}
                </Link>{' '}
                — форма обратной связи и другие способы связи.
              </li>
            </ul>
          </section>
        </div>

        <nav className={`mt-12 border-t pt-6 ${isSprintTheme ? 'border-slate-700' : 'border-gray-200'}`}>
          <Link
            href="/"
            className={`font-medium hover:underline ${isSprintTheme ? 'text-[#7AA2FF]' : 'text-action-blue'}`}
          >
            ← Вернуться на главную
          </Link>
        </nav>
      </article>
      </AdaptiveContainer>
    </div>
  )
}
