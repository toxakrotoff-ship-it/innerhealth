import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { ContactLinks } from '@/components/site/contact-links'
import { YandexMapDynamic } from '@/components/site/yandex-map-dynamic'
import { MAP_CENTER } from '@/lib/map-center'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import { getYandexMapsApiKey } from '@/services/settings.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { buildContentPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const { brandId, siteTitle } = await getServerBrandContext()
  return buildContentPageMetadata({
    brandId,
    page: 'contacts',
    path: '/contacts',
    fallbackTitle: 'Контакты',
    fallbackDescription: `Телефон, электронная почта и адрес шоурума ${siteTitle}. Москва, набережная Новикова-Прибоя. Время посещения по записи.`,
  })
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Контакты' },
]

const DEFAULT_ADDRESS = 'Набережная Новикова-Прибоя, д. 6, корп. 4\n2-й этаж, офис INNER HEALTH'
const DEFAULT_WORKING_WEEKDAYS = 'Пн–Пт: 10:00–19:00'
const DEFAULT_WORKING_WEEKENDS = 'Сб–Вс: 10:00–17:00'
const DEFAULT_WORKING_NOTE = ''
const DEFAULT_TITLE = 'Контакты'
const DEFAULT_CONTACTS_TITLE = 'Контакты'
const DEFAULT_PHONE_LABEL = 'Телефон:'
const DEFAULT_EMAIL_LABEL = 'Электронная почта:'
const DEFAULT_SHOWROOM_TITLE = 'Шоурум INNER HEALTH в Москве'
const DEFAULT_SHOWROOM_NOTE = 'Посещение — только по предварительной записи.'
const DEFAULT_SCHEDULE_TITLE = 'Время посещения по записи:'
const DEFAULT_WRITE_TITLE = 'Написать или позвонить:'

export const revalidate = 86400

function getText(block: { text: string | null } | undefined, fallback: string): string {
  const t = block?.text
  return t != null ? t.trim() : fallback
}

export default async function ContactsPage() {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const siteConfig = getBrandSiteConfig(brandId)
  const [blocks, yandexMapsApiKey] = await Promise.all([
    getResolvedBlocksForPage('contacts', brandId),
    getYandexMapsApiKey({ brandId }),
  ])
  const byKey = (key: string) => blocks.find((b) => b.key === key)

  const phone = getText(byKey('contacts.phone'), siteConfig.contact.phone)
  const email = getText(byKey('contacts.email'), siteConfig.contact.email)
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
  const pageTitle = getText(byKey('contacts.title'), DEFAULT_TITLE)
  const contactsTitle = getText(byKey('contacts.section.contacts_title'), DEFAULT_CONTACTS_TITLE)
  const phoneLabel = getText(byKey('contacts.label.phone'), DEFAULT_PHONE_LABEL)
  const emailLabel = getText(byKey('contacts.label.email'), DEFAULT_EMAIL_LABEL)
  const showroomTitle = getText(
    byKey('contacts.section.showroom_title'),
    DEFAULT_SHOWROOM_TITLE
  )
  const showroomNote = getText(
    byKey('contacts.section.showroom_note'),
    DEFAULT_SHOWROOM_NOTE
  )
  const scheduleTitle = getText(
    byKey('contacts.section.schedule_title'),
    DEFAULT_SCHEDULE_TITLE
  )
  const writeTitle = getText(byKey('contacts.section.write_title'), DEFAULT_WRITE_TITLE)

  const phoneHref = `tel:${phone.replace(/\s|\(|\)|-/g, '')}`
  const routeHref = `https://yandex.ru/maps/?rtext=~${MAP_CENTER[0]},${MAP_CENTER[1]}&rtt=auto`

  return (
    <div className={isSprintTheme ? 'bg-[#060A14] text-slate-100' : 'bg-white'}>
      <AdaptiveContainer maxWidth="default">
        <Breadcrumbs items={breadcrumbItems} isInverted={isSprintTheme} />
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
              className={`order-2 lg:order-none rounded-2xl overflow-hidden border min-h-[320px] ${
                isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-100'
              }`}
            >
              <YandexMapDynamic
                className="w-full h-full min-h-[320px]"
                apiKey={yandexMapsApiKey}
              />
            </div>

            <div className={`order-1 lg:order-none flex flex-col justify-center space-y-5 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
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
                {showroomNote && (
                  <p className={`mb-2 ${isSprintTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                    {showroomNote}
                  </p>
                )}
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
                {workingNote && (
                  <p
                    className={`mt-2 max-w-xl whitespace-pre-line rounded-md border px-3 py-2 text-sm font-semibold leading-snug ${
                      isSprintTheme
                        ? 'border-slate-700 bg-slate-800/40 text-slate-200'
                        : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                  >
                    {workingNote}
                  </p>
                )}
              </div>

              <div>
                <a
                  href={routeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
                    isSprintTheme
                      ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#7AA2FF]/90'
                      : 'bg-action-blue text-gray-800 hover:bg-action-blue/90'
                  }`}
                >
                  Построить маршрут
                </a>
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
