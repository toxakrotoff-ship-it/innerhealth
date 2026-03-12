import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { ContactLinks } from '@/components/site/contact-links'
import { YandexMapDynamic } from '@/components/site/yandex-map-dynamic'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getResolvedBlocksForPage } from '@/services/content-block.service'

export const metadata = {
  title: 'Контакты | Inner Health',
  description:
    'Телефон, электронная почта и адрес шоурума Inner Health. Москва, набережная Новикова-Прибоя. Режим работы.',
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Контакты' },
]

const DEFAULT_PHONE = '+7 (989) 103-91-92'
const DEFAULT_EMAIL = 'innerhealth@mail.ru'
const DEFAULT_ADDRESS =
  'г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис Inner Health'
const DEFAULT_WORKING_WEEKDAYS = 'Будние дни: с 10 до 22'
const DEFAULT_WORKING_WEEKENDS = 'Выходные: с 12 до 18'
const DEFAULT_WORKING_NOTE = '*по предварительному звонку'

export const revalidate = 86400

function getText(block: { text: string | null } | undefined, fallback: string): string {
  const t = block?.text?.trim()
  return t ?? fallback
}

export default async function ContactsPage() {
  const blocks = await getResolvedBlocksForPage('contacts')
  const byKey = (key: string) => blocks.find((b) => b.key === key)

  const phone = getText(byKey('contacts.phone'), DEFAULT_PHONE)
  const email = getText(byKey('contacts.email'), DEFAULT_EMAIL)
  const address = getText(byKey('contacts.address'), DEFAULT_ADDRESS)
  const workingWeekdays = getText(
    byKey('contacts.working_weekdays'),
    DEFAULT_WORKING_WEEKDAYS
  )
  const workingWeekends = getText(
    byKey('contacts.working_weekends'),
    DEFAULT_WORKING_WEEKENDS
  )
  const workingNote = getText(
    byKey('contacts.working_note'),
    DEFAULT_WORKING_NOTE
  )

  const phoneHref = `tel:${phone.replace(/\s|\(|\)|-/g, '')}`

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
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 min-h-[320px]">
              <YandexMapDynamic className="w-full h-full min-h-[320px]" />
            </div>

            <div className="flex flex-col justify-center space-y-5 text-gray-700">
              <div>
                <ResponsiveText as="h2" variant="lg" weight="semibold" className="mb-3">
                  Контакты
                </ResponsiveText>
                <p>
                  <span className="font-medium text-gray-600">Телефон:</span>{' '}
                  <a href={phoneHref} className="text-action-blue hover:underline">
                    {phone}
                  </a>
                </p>
                <p>
                  <span className="font-medium text-gray-600">
                    Электронная почта:
                  </span>{' '}
                  <a
                    href={`mailto:${email}`}
                    className="text-action-blue hover:underline"
                  >
                    {email}
                  </a>
                </p>
              </div>

              <div>
                <ResponsiveText as="h2" variant="lg" weight="semibold" className="mb-2">
                  Наш шоурум находится по адресу:
                </ResponsiveText>
                <p className="text-gray-700">{address}</p>
              </div>

              <div>
                <p className="font-medium text-gray-900 mb-1">Режим работы:</p>
                <p>{workingWeekdays}</p>
                <p>{workingWeekends}</p>
                <p className="text-gray-500 text-sm mt-1">{workingNote}</p>
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
