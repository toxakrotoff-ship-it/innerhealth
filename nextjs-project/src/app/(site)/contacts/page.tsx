import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { ContactLinks } from '@/components/site/contact-links'
import { YandexMapDynamic } from '@/components/site/yandex-map-dynamic'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: `Контакты | ${siteTitle}`,
    description: `Телефон, электронная почта и адрес шоурума ${siteTitle}. Москва, набережная Новикова-Прибоя. Режим работы.`,
  }
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Контакты' },
]

const DEFAULT_PHONE = '+7 (989) 103-91-92'
const DEFAULT_EMAIL = 'innerhealth@mail.ru'
const DEFAULT_ADDRESS_PREFIX = 'г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис'
const DEFAULT_WORKING_WEEKDAYS = 'Будние дни: с 10 до 22'
const DEFAULT_WORKING_WEEKENDS = 'Выходные: с 12 до 18'
const DEFAULT_WORKING_NOTE = '*по предварительному звонку'
const DEFAULT_TITLE = 'Контакты'
const DEFAULT_CONTACTS_TITLE = 'Контакты'
const DEFAULT_PHONE_LABEL = 'Телефон:'
const DEFAULT_EMAIL_LABEL = 'Электронная почта:'
const DEFAULT_SHOWROOM_TITLE = 'Наш шоурум находится по адресу:'
const DEFAULT_SCHEDULE_TITLE = 'Режим работы:'
const DEFAULT_WRITE_TITLE = 'Написать или позвонить:'

export const revalidate = 86400

function getText(block: { text: string | null } | undefined, fallback: string): string {
  const t = block?.text?.trim()
  return t && t.length > 0 ? t : fallback
}

export default async function ContactsPage() {
  const { siteTitle, brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const blocks = await getResolvedBlocksForPage('contacts', brandId)
  const byKey = (key: string) => blocks.find((b) => b.key === key)

  const phone = getText(byKey('contacts.phone'), DEFAULT_PHONE)
  const email = getText(byKey('contacts.email'), DEFAULT_EMAIL)
  const address = getText(byKey('contacts.address'), `${DEFAULT_ADDRESS_PREFIX} ${siteTitle}`)
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
  const pageTitle = getText(byKey('contacts.title'), DEFAULT_TITLE)
  const contactsTitle = getText(byKey('contacts.section.contacts_title'), DEFAULT_CONTACTS_TITLE)
  const phoneLabel = getText(byKey('contacts.label.phone'), DEFAULT_PHONE_LABEL)
  const emailLabel = getText(byKey('contacts.label.email'), DEFAULT_EMAIL_LABEL)
  const showroomTitle = getText(
    byKey('contacts.section.showroom_title'),
    DEFAULT_SHOWROOM_TITLE
  )
  const scheduleTitle = getText(
    byKey('contacts.section.schedule_title'),
    DEFAULT_SCHEDULE_TITLE
  )
  const writeTitle = getText(byKey('contacts.section.write_title'), DEFAULT_WRITE_TITLE)

  const phoneHref = `tel:${phone.replace(/\s|\(|\)|-/g, '')}`

  return (
    <div className={isSprintTheme ? 'bg-[#060A14] text-slate-100' : 'bg-white'}>
      <AdaptiveContainer maxWidth="default">
        <Breadcrumbs items={breadcrumbItems} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="pb-16 sm:pb-20">
        <ResponsiveText
          as="h1"
          variant="3xl"
          weight="bold"
          className={`mb-8 ${isSprintTheme ? 'text-slate-100' : ''}`}
        >
          {pageTitle}
        </ResponsiveText>

        <ScalableSpacing size="lg">
          <FluidGrid
            cols={1}
            colsDesktop={2}
            gap="4"
            adaptiveGap={false}
            className="lg:gap-5 xl:gap-6 2xl:gap-6 3xl:gap-8 4xl:gap-8"
          >
            <div
              className={`rounded-2xl overflow-hidden border min-h-[320px] ${
                isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-100'
              }`}
            >
              <YandexMapDynamic className="w-full h-full min-h-[320px]" />
            </div>

            <div className={`flex flex-col justify-center space-y-5 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
              <div>
                <ResponsiveText
                  as="h2"
                  variant="lg"
                  weight="semibold"
                  className={`mb-3 ${isSprintTheme ? 'text-slate-100' : ''}`}
                >
                  {contactsTitle}
                </ResponsiveText>
                <p>
                  <span className={`font-medium ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
                    {phoneLabel}
                  </span>{' '}
                  <a
                    href={phoneHref}
                    className={isSprintTheme ? 'text-[#7AA2FF] hover:underline' : 'text-action-blue hover:underline'}
                  >
                    {phone}
                  </a>
                </p>
                <p>
                  <span className={`font-medium ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
                    {emailLabel}
                  </span>{' '}
                  <a
                    href={`mailto:${email}`}
                    className={isSprintTheme ? 'text-[#7AA2FF] hover:underline' : 'text-action-blue hover:underline'}
                  >
                    {email}
                  </a>
                </p>
              </div>

              <div>
                <ResponsiveText
                  as="h2"
                  variant="lg"
                  weight="semibold"
                  className={`mb-2 ${isSprintTheme ? 'text-slate-100' : ''}`}
                >
                  {showroomTitle}
                </ResponsiveText>
                <p className={`whitespace-pre-line ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
                  {address}
                </p>
              </div>

              <div>
                <p className={`font-medium mb-1 ${isSprintTheme ? 'text-slate-100' : 'text-gray-900'}`}>
                  {scheduleTitle}
                </p>
                <p className="whitespace-pre-line">{workingWeekdays}</p>
                <p className="whitespace-pre-line">{workingWeekends}</p>
                <p
                  className={`mt-2 max-w-xl whitespace-pre-line rounded-md border px-3 py-2 text-sm font-semibold leading-snug ${
                    isSprintTheme
                      ? 'border-amber-400/35 bg-amber-500/10 text-amber-50'
                      : 'border-amber-200 bg-amber-50 text-amber-950'
                  }`}
                >
                  {workingNote}
                </p>
              </div>

              <div className="pt-2">
                <p className={`text-sm font-medium mb-2 ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
                  {writeTitle}
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
