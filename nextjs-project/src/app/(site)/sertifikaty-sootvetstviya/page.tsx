import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { GalleryBlock } from '@/components/site/gallery-block'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { getResolvedBlocksForPage } from '@/services/content-block.service'

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: `Сертификаты соответствия | ${siteTitle}`,
    description: `Сертификаты соответствия и документы, подтверждающие качество и безопасность продукции ${siteTitle}. Декларации и сертификаты качества.`,
  }
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
  const { brandId } = await getServerBrandContext()
  const blocks = await getResolvedBlocksForPage('certificates', brandId)

  const title = getBlockText(blocks, 'certificates.title', 'Сертификаты соответствия')
  const subtitle = getBlockText(
    blocks,
    'certificates.subtitle',
    'Документы, подтверждающие качество и соответствие продукции требованиям безопасности'
  )

  const aboutTitle = getBlockText(blocks, 'certificates.section.about.title', 'О документах')
  const aboutP1 = getBlockText(
    blocks,
    'certificates.section.about.p1',
    'Inner Health уделяет особое внимание качеству и безопасности продукции. Ниже представлены сертификаты соответствия, декларации о соответствии и иные документы, подтверждающие соответствие товаров действующим нормам и стандартам.'
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
  const contactsEmail = getBlockText(blocks, 'certificates.section.contacts.email', 'innerhealth@mail.ru')
  const contactsPageLabel = getBlockText(blocks, 'certificates.section.contacts.contactsPageLabel', 'Контакты')

  return (
    <div className="bg-white min-h-screen">
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <article>
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text">
            {title}
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            {subtitle}
          </p>
        </header>

        <GalleryBlock />

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">
          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              {aboutTitle}
            </h2>
            <p className="mb-4">
              {aboutP1}
            </p>
            <p>
              {aboutP2}{' '}
              <a
                href={`mailto:${contactsEmail}`}
                className="text-action-blue hover:underline"
              >
                {contactsEmail}
              </a>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              {declarationsTitle}
            </h2>
            <p className="mb-4">
              {declarationsP1}
            </p>
            <p className="text-gray-600 text-sm">
              {declarationsNote}
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              {productCertificatesTitle}
            </h2>
            <p className="mb-4">
              {productCertificatesP1}
            </p>
            <p className="text-gray-600 text-sm">
              {productCertificatesNote}
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              {contactsTitle}
            </h2>
            <p className="mb-2">
              {contactsIntro}
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>
                Email:{' '}
                <a
                  href={`mailto:${contactsEmail}`}
                  className="text-action-blue hover:underline"
                >
                  {contactsEmail}
                </a>
              </li>
              <li>
                Раздел{' '}
                <Link href="/contacts" className="text-action-blue hover:underline">
                  {contactsPageLabel}
                </Link>{' '}
                — форма обратной связи и другие способы связи.
              </li>
            </ul>
          </section>
        </div>

        <nav className="mt-12 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="text-action-blue hover:underline font-medium"
          >
            ← Вернуться на главную
          </Link>
        </nav>
      </article>
      </AdaptiveContainer>
    </div>
  )
}
