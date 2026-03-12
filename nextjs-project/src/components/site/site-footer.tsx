import Link from 'next/link'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getResolvedBlocksForPage } from '@/services/content-block.service'

const FOOTER_LINKS = [
  { label: 'О нас', href: '/o-nas' },
  { label: 'Контакты', href: '/contacts' },
  { label: 'Сертификаты соответствия', href: '/sertifikaty-sootvetstviya' },
  { label: 'Сотрудничество', href: '/sotrudnichestvo' },
  { label: 'Отзывы', href: '/otzyvy' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Информация', href: '/informaciya' },
  { label: 'Политика конфиденциальности', href: '/privacy' },
  { label: 'Публичная оферта', href: '/oferta' },
] as const

export async function SiteFooter() {
  const blocks = await getResolvedBlocksForPage('footer')
  const fullName = blocks.find((b) => b.key === 'footer.legal.fullName')
  const address = blocks.find((b) => b.key === 'footer.legal.address')
  const correspondentAccount = blocks.find(
    (b) => b.key === 'footer.bank.correspondentAccount'
  )
  const bic = blocks.find((b) => b.key === 'footer.bank.bic')
  const ogrnip = blocks.find((b) => b.key === 'footer.bank.ogrnip')
  const inn = blocks.find((b) => b.key === 'footer.bank.inn')

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <ScalableSpacing direction="vertical" size={96} usePadding adaptive>
        <AdaptiveContainer
          maxWidth="6xl"
          adaptivePadding
          className="py-6 sm:py-8 lg:py-10"
        >
          {/* Основная сетка с 4 колонками на десктопе и выше */}
          <FluidGrid
            cols={1}
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
                className="mb-3"
                adaptive
              >
                Inner Health
              </ResponsiveText>
              <ResponsiveText
                as="p"
                variant="sm"
                weight="light"
                color="secondary"
                leading="relaxed"
                adaptive
              >
                Нутриенты и продукты для здоровья
              </ResponsiveText>
            </div>

            {/* Колонка 2: Информация */}
            <div>
              <ResponsiveText
                as="h3"
                variant="xs"
                weight="semibold"
                uppercase
                tracking="widest"
                color="primary"
                className="mb-6"
                adaptive
              >
                Информация
              </ResponsiveText>
              <ul className="space-y-4">
                {FOOTER_LINKS.slice(0, 3).map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="hover:text-action-blue transition-colors"
                    >
                      <ResponsiveText
                        as="span"
                        variant="sm"
                        weight="light"
                        color="secondary"
                        adaptive
                      >
                        {label}
                      </ResponsiveText>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Колонка 3: Покупателям */}
            <div>
              <ResponsiveText
                as="h3"
                variant="xs"
                weight="semibold"
                uppercase
                tracking="widest"
                color="primary"
                className="mb-6"
                adaptive
              >
                Покупателям
              </ResponsiveText>
              <ul className="space-y-4">
                {FOOTER_LINKS.slice(3, 7).map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="hover:text-action-blue transition-colors"
                    >
                      <ResponsiveText
                        as="span"
                        variant="sm"
                        weight="light"
                        color="secondary"
                        adaptive
                      >
                        {label}
                      </ResponsiveText>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Колонка 4: Юридическое */}
            <div>
              <ResponsiveText
                as="h3"
                variant="xs"
                weight="semibold"
                uppercase
                tracking="widest"
                color="primary"
                className="mb-6"
                adaptive
              >
                Юридическое
              </ResponsiveText>
              <ul className="space-y-4">
                {FOOTER_LINKS.slice(7, 9).map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="hover:text-action-blue transition-colors"
                    >
                      <ResponsiveText
                        as="span"
                        variant="sm"
                        weight="light"
                        color="secondary"
                        adaptive
                      >
                        {label}
                      </ResponsiveText>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </FluidGrid>

          {/* Реквизиты */}
          <ScalableSpacing direction="vertical" size={96} adaptive>
            <div className="border-t border-slate-200 pt-8">
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
                <div className="space-y-2">
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className="font-semibold text-slate-900">
                      Название полное:
                    </span>{' '}
                    <span className="text-slate-600">
                      {fullName?.text ?? 'ИП Кудимов Валерий Валерьевич'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className="font-semibold text-slate-900">
                      Юридический адрес:
                    </span>{' '}
                    <span className="text-slate-600">
                      {address?.text ??
                        '196140, г. Санкт-Петербург, Пулковское шоссе, д. 73, корп. 2, стр. 1, кв. 85'}
                    </span>
                  </ResponsiveText>
                </div>
                <div className="space-y-2">
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className="font-semibold text-slate-900">
                      Корреспондентский счёт:
                    </span>{' '}
                    <span className="text-slate-600">
                      {correspondentAccount?.text ?? '30101 810 4 0000 0000225'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className="font-semibold text-slate-900">БИК:</span>{' '}
                    <span className="text-slate-600">
                      {bic?.text ?? '044525225'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className="font-semibold text-slate-900">
                      ОГРНИП:
                    </span>{' '}
                    <span className="text-slate-600">
                      {ogrnip?.text ?? '322784700221371'}
                    </span>
                  </ResponsiveText>
                  <ResponsiveText as="p" variant="sm" adaptive>
                    <span className="font-semibold text-slate-900">ИНН:</span>{' '}
                    <span className="text-slate-600">
                      {inn?.text ?? '550622300904'}
                    </span>
                  </ResponsiveText>
                </div>
              </FluidGrid>
            </div>
          </ScalableSpacing>

          {/* Копирайт */}
          <ScalableSpacing direction="vertical" size={96} adaptive>
            <div className="border-t border-slate-200 pt-8 flex flex-wrap items-center justify-center gap-2">
              <ResponsiveText
                as="span"
                variant="sm"
                color="secondary"
                adaptive
              >
                © 2022 INNER HEALTH
              </ResponsiveText>
              <span className="text-slate-300" aria-hidden>
                |
              </span>
              <Link
                href="/privacy"
                className="text-orange-600 hover:text-orange-700 transition-colors"
              >
                <ResponsiveText
                  as="span"
                  variant="sm"
                  weight="medium"
                  adaptive
                >
                  Политика конфиденциальности
                </ResponsiveText>
              </Link>
            </div>
          </ScalableSpacing>
        </AdaptiveContainer>
      </ScalableSpacing>
    </footer>
  )
}
