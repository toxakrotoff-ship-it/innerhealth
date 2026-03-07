import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { ContactLinks } from '@/components/site/contact-links'
import { YandexMapDynamic } from '@/components/site/yandex-map-dynamic'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'

export const metadata = {
  title: 'Контакты | Inner Health',
  description:
    'Телефон, электронная почта и адрес шоурума Inner Health. Москва, набережная Новикова-Прибоя. Режим работы.',
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Контакты' },
]

const PHONE = '+7 (989) 103-91-92'
const EMAIL = 'innerhealth@mail.ru'
const ADDRESS =
  'г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис Inner Health'

export default function ContactsPage() {
  return (
    <div className="bg-white min-h-screen">
      <AdaptiveContainer maxWidth="default">
        <Breadcrumbs items={breadcrumbItems} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default">
        <ResponsiveText as="h1" variant="3xl" weight="bold" className="mb-8">
          Контакты
        </ResponsiveText>

        <ScalableSpacing size="lg">
          <FluidGrid cols={1} colsDesktop={2} gap={6} adaptiveGap>
            {/* Карта слева */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 min-h-[320px]">
              <YandexMapDynamic className="w-full h-full min-h-[320px]" />
            </div>

            {/* Текстовый блок справа */}
            <div className="flex flex-col justify-center space-y-5 text-gray-700">
              <div>
                <ResponsiveText as="h2" variant="lg" weight="semibold" className="mb-3">
                  Контакты
                </ResponsiveText>
                <p>
                  <span className="font-medium text-gray-600">Телефон:</span>{' '}
                  <a
                    href={`tel:${PHONE.replace(/\s|\(|\)|-/g, '')}`}
                    className="text-action-blue hover:underline"
                  >
                    {PHONE}
                  </a>
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Электронная почта:
                  </span>{' '}
                  <a
                    href={`mailto:${EMAIL}`}
                    className="text-action-blue hover:underline"
                  >
                    {EMAIL}
                  </a>
                </p>
              </div>

              <div>
                <ResponsiveText as="h2" variant="lg" weight="semibold" className="mb-2">
                  Наш шоурум находится по адресу:
                </ResponsiveText>
                <p className="text-gray-700">{ADDRESS}</p>
              </div>

              <div>
                <p className="font-medium text-gray-900 mb-1">Режим работы:</p>
                <p>Будние дни: с 10 до 22</p>
                <p>Выходные: с 12 до 18</p>
                <p className="text-gray-500 text-sm mt-1">
                  *по предварительному звонку
                </p>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Написать или позвонить:
                </p>
                <ContactLinks />
              </div>
            </div>
          </FluidGrid>
        </ScalableSpacing>
      </AdaptiveContainer>
    </div>
  )
}
