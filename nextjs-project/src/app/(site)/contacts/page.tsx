import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { YandexMap } from '@/components/site/yandex-map'
import { ContactLinks } from '@/components/site/contact-links'

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
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-text mb-8">
          Контакты
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Карта слева */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 min-h-[320px]">
            <YandexMap className="w-full h-full min-h-[320px]" />
          </div>

          {/* Текстовый блок справа */}
          <div className="flex flex-col justify-center space-y-5 text-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Контакты
              </h2>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Наш шоурум находится по адресу:
              </h2>
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
        </div>
      </div>
    </div>
  )
}
