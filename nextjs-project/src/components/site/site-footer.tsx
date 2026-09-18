import Link from 'next/link'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import type { BrandId } from '@/lib/brand/brand'

const SITE_DEVELOPER_TELEGRAM_URL = 'https://t.me/Tony_CoffeeZombie'
const SITE_DEVELOPER_TELEGRAM_LABEL = '@Tony_CoffeeZombie'

export async function SiteFooter({ brandId }: { brandId: BrandId }) {
  const siteConfig = getBrandSiteConfig(brandId)
  const isSprintTheme = brandId === 'sprint-power'
  const footerColumns = siteConfig.footerColumns
  const blocks = await getResolvedBlocksForPage('footer', brandId)
  const fullName = blocks.find((b) => b.key === 'footer.legal.fullName')
  const address = blocks.find((b) => b.key === 'footer.legal.address')
  const correspondentAccount = blocks.find(
    (b) => b.key === 'footer.bank.correspondentAccount'
  )
  const bic = blocks.find((b) => b.key === 'footer.bank.bic')
  const ogrnip = blocks.find((b) => b.key === 'footer.bank.ogrnip')
  const inn = blocks.find((b) => b.key === 'footer.bank.inn')
  const getText = (key: string, fallback: string) => blocks.find((b) => b.key === key)?.text?.trim() || fallback
  const getLinkKey = (href: string, label: string) => {
    if (href === '/catalog') return 'footer.link.catalog'
    if (href === '/news') return 'footer.link.news'
    if (href === '/o-nas') return 'footer.link.about'
    if (href === '/catalog/aktsii' || href === '/catalog?sort=newest') return 'footer.link.promotions'
    if (href === '/informaciya') return 'footer.link.articles'
    if (href === '/b2b') return 'footer.link.b2b'
    if (href === '/contacts') return 'footer.link.contacts'
    if (href === '/sotrudnichestvo') return 'footer.link.cooperation'
    if (href === '/otzyvy') return 'footer.link.reviews'
    if (href === '/faq') return label.startsWith('Доставка') ? 'footer.link.delivery' : 'footer.link.faq'
    if (href === '/privacy') return 'footer.link.privacy'
    if (href === '/oferta') return 'footer.link.offer'
    if (href.startsWith('/#partners')) return 'footer.link.partners'
    return null
  }
  const getLinkLabel = (label: string, href: string) => {
    const key = getLinkKey(href, label)
    return key ? getText(key, label) : label
  }

  const footerLinkSectionClass = ''

  const footerColumnHeadingClass = isSprintTheme
    ? 'mb-3 text-slate-100 md:mb-6 2xl:mb-7'
    : 'mb-3 md:mb-6 2xl:mb-7'

  return (
    <footer
      className={`mt-auto ${
        isSprintTheme ? 'bg-[#060A14] border-t border-slate-800' : 'bg-slate-50 border-t border-slate-200'
      }`}
    >
      <ScalableSpacing direction="vertical" size={96} usePadding adaptive>
        <AdaptiveContainer
          maxWidth="6xl"
          adaptivePadding
          className="py-8 sm:py-10 lg:py-12 2xl:py-14 3xl:py-16"
        >
          {/* Основная сетка: 2 колонки на мобильных, 4 — на десктопе и выше */}
          <FluidGrid
            cols={2}
            colsTablet={2}
            colsDesktop={4}
            colsXl={4}
            cols2xl={4}
            cols3xl={4}
            cols4xl={4}
            cols5xl={4}
            cols6xl={4}
            gap={8}
            adaptiveGap
            align="start"
            justify="between"
          >
            {/* Колонка 1: Бренд */}
            <div>
              <ResponsiveText
                as="h3"
                variant="xs"
                weight="semibold"
                uppercase
                tracking="widest"
                color="primary"
                className={isSprintTheme ? 'mb-3 text-slate-100 2xl:mb-4' : 'mb-3 2xl:mb-4'}
                adaptive
              >
                {siteConfig.title}
              </ResponsiveText>
              <ResponsiveText
                as="p"
                variant="sm"
                weight="light"
                color="secondary"
                leading="relaxed"
                adaptive
              >
                {getText(
                  'footer.brand.description',
                  isSprintTheme ? 'Нутриенты и продукты для здоровья' : 'Российский бренд функционального питания'
                )}
              </ResponsiveText>
            </div>

            {/* Колонки 2-4: собраны из siteConfig.footerColumns (разный состав у разных брендов) */}
            {footerColumns.map((column) => (
              <div key={column.title} className={footerLinkSectionClass}>
                <ResponsiveText
                  as="h3"
                  variant="xs"
                  weight="semibold"
                  uppercase
                  tracking="widest"
                  color="primary"
                  className={footerColumnHeadingClass}
                  adaptive
                >
                  {getText(`footer.column.${column.title}.title`, column.title)}
                </ResponsiveText>
                <ul className="space-y-4 2xl:space-y-5">
                  {column.links.map(({ label, href }) => (
                    <li key={href + label}>
                      <Link
                        href={href}
                        className={`desktop-microtext-scale inline-flex min-h-[36px] items-center transition-colors ${
                          isSprintTheme
                            ? 'text-slate-400 hover:text-white'
                            : 'hover:text-action-blue'
                        }`}
                      >
                        <ResponsiveText
                          as="span"
                          variant="sm"
                          weight="light"
                          color={isSprintTheme ? 'current' : 'secondary'}
                          adaptive
                        >
                          {getLinkLabel(label, href)}
                        </ResponsiveText>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </FluidGrid>

          {/* Реквизиты */}
          <ScalableSpacing direction="vertical" size={96} adaptive>
            <div className={`pt-8 2xl:pt-10 ${isSprintTheme ? 'border-t border-slate-800' : 'border-t border-slate-200'}`}>
              <FluidGrid
                cols={1}
                colsTablet={2}
                colsDesktop={2}
                colsXl={2}
                cols2xl={2}
                cols3xl={2}
                cols4xl={2}
                cols5xl={2}
                cols6xl={2}
                gap={8}
                adaptiveGap
                align="start"
                justify="between"
              >
                <div className="space-y-2 2xl:space-y-3">
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className={`font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                      Название полное:
                    </span>{' '}
                    <span className={isSprintTheme ? 'text-slate-300' : 'text-slate-600'}>
                      {fullName?.text ?? 'ИП Кудимов Валерий Валерьевич'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className={`font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                      Юридический адрес:
                    </span>{' '}
                    <span className={isSprintTheme ? 'text-slate-300' : 'text-slate-600'}>
                      {address?.text ??
                        '196140, г. Санкт-Петербург, Пулковское шоссе, д. 73, корп. 2, стр. 1, кв. 85'}
                    </span>
                  </ResponsiveText>
                </div>
                <div className="space-y-2 2xl:space-y-3">
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className={`font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                      Корреспондентский счёт:
                    </span>{' '}
                    <span className={isSprintTheme ? 'text-slate-300' : 'text-slate-600'}>
                      {correspondentAccount?.text ?? '30101 810 4 0000 0000225'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className={`font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>БИК:</span>{' '}
                    <span className={isSprintTheme ? 'text-slate-300' : 'text-slate-600'}>
                      {bic?.text ?? '044525225'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className={`font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                      ОГРНИП:
                    </span>{' '}
                    <span className={isSprintTheme ? 'text-slate-300' : 'text-slate-600'}>
                      {ogrnip?.text ?? '322784700221371'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className={`font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>ИНН:</span>{' '}
                    <span className={isSprintTheme ? 'text-slate-300' : 'text-slate-600'}>
                      {inn?.text ?? '550622300904'}
                    </span>
                  </ResponsiveText>
                </div>
              </FluidGrid>
            </div>
          </ScalableSpacing>

          {/* Копирайт */}
          <ScalableSpacing direction="vertical" size={96} adaptive>
            <div
              className={`flex flex-wrap items-center justify-center gap-2 pt-8 2xl:pt-10 ${
                isSprintTheme ? 'border-t border-slate-800' : 'border-t border-slate-200'
              }`}
            >
              <ResponsiveText
                as="span"
                variant="sm"
                color="secondary"
                adaptive
              >
                {getText('footer.copyright', `© 2026 ${siteConfig.logoText}`)}
              </ResponsiveText>
              <span className={isSprintTheme ? 'text-slate-600' : 'text-slate-300'} aria-hidden>
                |
              </span>
              <Link
                href="/privacy"
                className={`desktop-microtext-scale inline-flex min-h-[36px] items-center transition-colors ${
                  isSprintTheme ? 'text-[#7AA2FF] hover:text-[#93b7ff]' : 'text-orange-600 hover:text-orange-700'
                }`}
              >
                <ResponsiveText
                  as="span"
                  variant="sm"
                  weight="medium"
                  className={isSprintTheme ? 'text-[#7AA2FF]' : undefined}
                  adaptive
                >
                  {getText('footer.privacyLabel', 'Политика конфиденциальности')}
                </ResponsiveText>
              </Link>
              <span className={isSprintTheme ? 'text-slate-600' : 'text-slate-300'} aria-hidden>
                |
              </span>
              <Link
                href="/oferta"
                className={`desktop-microtext-scale inline-flex min-h-[36px] items-center transition-colors ${
                  isSprintTheme ? 'text-[#7AA2FF] hover:text-[#93b7ff]' : 'text-orange-600 hover:text-orange-700'
                }`}
              >
                <ResponsiveText
                  as="span"
                  variant="sm"
                  weight="medium"
                  className={isSprintTheme ? 'text-[#7AA2FF]' : undefined}
                  adaptive
                >
                  {getText('footer.offerLabel', 'Публичная оферта')}
                </ResponsiveText>
              </Link>
              <span className={isSprintTheme ? 'text-slate-600' : 'text-slate-300'} aria-hidden>
                |
              </span>
              <ResponsiveText
                as="span"
                variant="sm"
                color="secondary"
                adaptive
              >
                {getText('footer.developerLabel', 'Разработка сайта:')}{' '}
              </ResponsiveText>
              <a
                href={SITE_DEVELOPER_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`desktop-microtext-scale inline-flex min-h-[36px] items-center transition-colors ${
                  isSprintTheme
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-action-blue'
                }`}
              >
                <ResponsiveText
                  as="span"
                  variant="sm"
                  weight="light"
                  color={isSprintTheme ? 'current' : 'secondary'}
                  adaptive
                >
                  {SITE_DEVELOPER_TELEGRAM_LABEL}
                </ResponsiveText>
              </a>
            </div>
          </ScalableSpacing>
        </AdaptiveContainer>
      </ScalableSpacing>
    </footer>
  )
}
