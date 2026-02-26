import Link from 'next/link'

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

const LEGAL = {
  fullName: 'ИП Кудимов Валерий Валерьевич',
  address:
    '196140, г. Санкт-Петербург, Пулковское шоссе, д. 73, корп. 2, стр. 1, кв. 85',
} as const

const BANK = {
  correspondentAccount: '30101 810 4 0000 0000225',
  bic: '044525225',
  ogrnip: '322784700221371',
  inn: '550622300904',
} as const

export function SiteFooter() {
  return (
    <footer className="bg-sky-50/80 border-t border-gray-200 text-text mt-auto">
      <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Inner Health</h3>
            <p className="text-sm text-gray-600">
              Нутриенты и продукты для здоровья
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Информация</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {FOOTER_LINKS.slice(0, 3).map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-action-blue transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Покупателям</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {FOOTER_LINKS.slice(3, 7).map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-action-blue transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Юридическое</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {FOOTER_LINKS.slice(7, 9).map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-action-blue transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Реквизиты */}
        <div className="mt-10 pt-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <p>
              <span className="font-semibold text-gray-900">Название полное:</span>{' '}
              <span className="text-gray-700">{LEGAL.fullName}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">Юридический адрес:</span>{' '}
              <span className="text-gray-700">{LEGAL.address}</span>
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <span className="font-semibold text-gray-900">Корреспондентский счёт:</span>{' '}
              <span className="text-gray-700">{BANK.correspondentAccount}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">БИК:</span>{' '}
              <span className="text-gray-700">{BANK.bic}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">ОГРНИП:</span>{' '}
              <span className="text-gray-700">{BANK.ogrnip}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">ИНН:</span>{' '}
              <span className="text-gray-700">{BANK.inn}</span>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
          <span>© 2022 INNER HEALTH</span>
          <span className="text-gray-400">|</span>
          <Link
            href="/privacy"
            className="text-orange-600 hover:text-orange-700 transition-colors"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </div>
    </footer>
  )
}
