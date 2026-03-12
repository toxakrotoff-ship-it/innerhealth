import Link from 'next/link'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { GalleryBlock } from '@/components/site/gallery-block'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

export const metadata = {
  title: 'Сертификаты соответствия | Inner Health',
  description:
    'Сертификаты соответствия и документы, подтверждающие качество и безопасность продукции Inner Health. Декларации, сертификаты органической продукции.',
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Сертификаты соответствия' },
]

export default function CertificatesPage() {
  return (
    <div className="bg-white min-h-screen">
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <article>
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text">
            Сертификаты соответствия
          </h1>
          <p className="mt-2 text-gray-500 text-sm">
            Документы, подтверждающие качество и соответствие продукции
            требованиям безопасности
          </p>
        </header>

        <GalleryBlock />

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">
          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              О документах
            </h2>
            <p className="mb-4">
              Inner Health уделяет особое внимание качеству и безопасности
              продукции. Ниже представлены сертификаты соответствия, декларации
              о соответствии и иные документы, подтверждающие соответствие
              товаров действующим нормам и стандартам.
            </p>
            <p>
              При необходимости вы можете запросить копии документов по
              электронной почте{' '}
              <a
                href="mailto:innerhealth@mail.ru"
                className="text-action-blue hover:underline"
              >
                innerhealth@mail.ru
              </a>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              Декларации о соответствии ТР ТС
            </h2>
            <p className="mb-4">
              Продукция, реализуемая в рамках Таможенного союза (ЕАЭС),
              сопровождается декларациями о соответствии техническим регламентам
              ТР ТС (например, ТР ТС 021/2011 «О безопасности пищевой продукции»,
              ТР ТС 029/2012 и др.), где применимо.
            </p>
            <p className="text-gray-600 text-sm">
              Декларации хранятся у продавца и предоставляются по запросу
              покупателя или контролирующих органов.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              Сертификаты на продукцию
            </h2>
            <p className="mb-4">
              Отдельные категории товаров могут иметь добровольную сертификацию
              или сертификаты соответствия по российским и международным
              стандартам (в том числе органическая продукция, при наличии).
            </p>
            <p className="text-gray-600 text-sm">
              Актуальный перечень сертификатов и сканы документов будут
              размещены в этом разделе. По вопросам наличия сертификатов на
              конкретный товар обращайтесь в службу поддержки.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-text mb-4">
              Контакты
            </h2>
            <p className="mb-2">
              По вопросам сертификатов и документов:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>
                Email:{' '}
                <a
                  href="mailto:innerhealth@mail.ru"
                  className="text-action-blue hover:underline"
                >
                  innerhealth@mail.ru
                </a>
              </li>
              <li>
                Раздел{' '}
                <Link href="/contacts" className="text-action-blue hover:underline">
                  Контакты
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
