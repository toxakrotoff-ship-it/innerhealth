import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { PartnershipForm } from '@/components/site/partnership-form'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

export const metadata = {
  title: 'Сотрудничество | Inner Health',
  description:
    'Партнёрская программа Inner Health: скидки, кешбэк, оптовые условия. Сотрудничаем с врачами, нутрициологами, health-coach, косметологами и фитнес-тренерами.',
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Сотрудничество' },
]

export default function SotrudnichestvoPage() {
  return (
    <div className="bg-white min-h-screen">
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text mb-4">
            Сотрудничество
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Inner Health: внешние трансформации через красоту изнутри
          </p>
        </header>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-text mb-3">
              Вступайте в команду Inner Health!
            </h2>
            <p>
              Объединяем тех, кто точно знает, что молодость и красота – физическое проявление
              внутреннего здоровья.
            </p>
            <p>
              В основе разработок наших препаратов — знание физиологии, научные исследования,
              превентивная практика, передовые технологии и контроль качества.
            </p>
            <p className="font-medium text-text">
              Эффективные формулы. Максимальная биодоступность. Бескомпромиссный результат.
              Пролонгированное действие.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">С кем мы работаем</h2>
            <p>
              Сотрудничаем с врачами, нутрициологами, health-coach, специалистами помогающих
              профессий, фитнес-тренерами, косметологами.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-text mb-4">Вы получите</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>Скидка до 25%</strong> по личному промокоду для вас, ваших клиентов,
                пациентов, друзей и знакомых.
              </li>
              <li>
                <strong>Ежемесячный кешбэк</strong> от суммы заказа по промокоду — выплачивается по
                результатам месяца на вашу банковскую карту.
              </li>
              <li>
                <strong>Выгодные условия</strong> для оптовых закупок и работы представительств в
                регионах.
              </li>
            </ol>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-text mb-4">А также</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                Есть интересные кейсы применения наших продуктов и вы готовы ими делиться —{' '}
                <strong>предоставим свои информационные ресурсы</strong>.
              </li>
              <li>
                Интересно апробировать в профилактических и терапевтических протоколах и есть
                возможность фиксировать результат — <strong>обсудим и предоставим особые условия</strong>{' '}
                на приобретение продукции.
              </li>
              <li>
                Изучаете рынок продуктов для здоровья и делаете обзоры в соцсетях —{' '}
                <strong>расскажем о преимуществах и предоставим продукты на тестирование</strong>.
              </li>
            </ol>
          </section>
        </div>

        <section className="mt-14 pt-10 border-t border-gray-200">
          <h2 className="text-2xl font-semibold text-text mb-2">Оставить заявку</h2>
          <p className="text-gray-600 mb-8">
            Заполните форму — мы свяжемся с вами и обсудим условия сотрудничества.
          </p>
          <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <PartnershipForm />
          </div>
        </section>
      </AdaptiveContainer>
    </div>
  )
}
