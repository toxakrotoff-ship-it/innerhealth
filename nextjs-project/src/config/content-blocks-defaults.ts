import type { JSONContent } from '@tiptap/core'

export interface ContentBlockDefault {
  page: string
  key: string
  label: string
  type: 'short' | 'rich'
  text?: string
  richJson?: JSONContent
  colorToken?: string
  fontVariant?: string
  /** thin | light | normal | medium | semibold | bold | extrabold */
  fontWeight?: string
}

export const CONTENT_BLOCK_DEFAULTS: ContentBlockDefault[] = [
  // Home / Hero
  {
    page: 'home',
    key: 'hero.badge',
    label: 'Hero — бейдж',
    type: 'short',
    text: 'НОВЫЙ СТАНДАРТ БИОДОБАВОК',
    colorToken: 'text-white',
  },
  {
    page: 'home',
    key: 'hero.title',
    label: 'Hero — заголовок',
    type: 'short',
    text: 'Функциональное\nпитание для\nтвоего\nбаланса.',
    colorToken: 'text-white',
    fontWeight: 'thin',
  },
  {
    page: 'home',
    key: 'hero.title.highlight',
    label: 'Hero — какое слово выделить цветом',
    type: 'short',
    text: 'твоего',
    colorToken: 'text-blue-300',
  },
  {
    page: 'home',
    key: 'hero.subtitle',
    label: 'Hero — подзаголовок',
    type: 'short',
    text: 'Мы объединили чистоту натуральных ингредиентов и высокие технологии для поддержания вашего здоровья на клеточном уровне.',
    colorToken: 'text-slate-300',
    fontWeight: 'light',
  },

  // Home sections
  {
    page: 'home',
    key: 'home.new.subtitle',
    label: 'Новинки — подпись',
    type: 'short',
    text: 'Самые актуальные разработки для вашего здоровья и энергии',
    colorToken: 'text-slate-500',
  },
  {
    page: 'home',
    key: 'home.news.subtitle',
    label: 'Новости — подпись',
    type: 'short',
    text: 'Актуальные события и обновления',
    colorToken: 'text-slate-500',
  },
  {
    page: 'home',
    key: 'home.catalog.subtitle',
    label: 'Разделы каталога — подпись',
    type: 'short',
    text: 'Выберите категорию для быстрого поиска нужного продукта',
    colorToken: 'text-slate-500',
  },
  {
    page: 'home',
    key: 'home.articles.subtitle',
    label: 'Статьи — подпись',
    type: 'short',
    text: 'Полезные материалы о здоровье и нутриентах',
    colorToken: 'text-slate-500',
  },
  {
    page: 'home',
    key: 'home.reviews.subtitle',
    label: 'Отзывы — подпись',
    type: 'short',
    text: 'Мнения наших клиентов',
    colorToken: 'text-slate-500',
  },

  // Home — блок отзывов (CTA)
  {
    page: 'home',
    key: 'home.reviews.cta.title',
    label: 'Отзывы (CTA) — заголовок',
    type: 'short',
    text: 'Нам важно ваше мнение',
    colorToken: 'text-white',
  },
  {
    page: 'home',
    key: 'home.reviews.cta.text',
    label: 'Отзывы (CTA) — текст',
    type: 'short',
    text: 'Оставьте отзыв — он появится на сайте после модерации. Ваш опыт помогает другим выбирать лучшее.',
    colorToken: 'text-slate-400',
  },

  // Home — Sprint Power блок
  {
    page: 'home',
    key: 'home.sprint.title',
    label: 'Sprint Power — заголовок',
    type: 'short',
    text: 'Больше чем спорт. Чистая энергия.',
    colorToken: 'text-slate-900',
  },
  {
    page: 'home',
    key: 'home.sprint.text',
    label: 'Sprint Power — текст',
    type: 'short',
    text: 'Sprint Power — это инновационные формулы, правильные пропорции и высококачественное сырье в биодоступной форме. Добавки, которые сделают ваши тренировки эффективнее, а победы — ярче.',
    colorToken: 'text-slate-600',
  },

  // About page
  {
    page: 'about',
    key: 'about.block1',
    label: 'О нас — блок 1 (формула красоты)',
    type: 'rich',
    richJson: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Формула красоты и молодости существует. Главное в ней не дорогие крема, сыворотки, кондиционеры и шампуни. Красота рождается изнутри. Здоровые люди обворожительны по-особому.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Inner Health – это инновационные здоровьесберегающие продукты с нутрикосметическим эффектом. Они расширяют границы вашего потенциала. С ними ваш белковый статус в норме. А ухоженная, упругая кожа, густые, блестящие волосы, легкая походка, стройное тело вне времени, вне возраста.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Все от разработки формул и производства основного сырья делаем в России. Стоимость продукции не обременена затратами на логистику и колебаниями курса доллара.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Чистые составы без дополнительных объемных реагентов, консервантов, красителей, подсластителей. Высокая биодоступность и эффективная синергия компонентов. Результативность пролонгирована. Ее чувствуют, видят, ценят.',
            },
          ],
        },
      ],
    } as JSONContent,
  },
  {
    page: 'about',
    key: 'about.block2.title',
    label: 'О нас — блок 2 заголовок',
    type: 'short',
    text: 'Inner Health',
  },
  {
    page: 'about',
    key: 'about.block2.text',
    label: 'О нас — блок 2 текст',
    type: 'rich',
    richJson: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Inner Health на рынке с 2022 года, но уже сыскала доверие покупателей. Более 5000 человек каждый день становятся с нами здоровее и возвращаются вновь и вновь. Особая гордость – более 2000 положительных отзывов, которые вдохновляют нас идти дальше. Бесценно доверие врачей конвенциальной и превентивной медицины, нутрициологов, диетологов, косметологов.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Сотрудничаем с Международным институтом PreventAge, Университетом образовательной медицины (UOM), Международным институтом интегративной нутрициологии (МИИН), Первым Московским государственным медицинским университетом им. И.М. Сеченова.',
            },
          ],
        },
      ],
    } as JSONContent,
  },

  // About images
  {
    page: 'about',
    key: 'about.image1.src',
    label: 'О нас — изображение 1 (URL)',
    type: 'short',
    text: '/images/o-nas/face-lift.jpg',
  },
  {
    page: 'about',
    key: 'about.image1.alt',
    label: 'О нас — изображение 1 alt',
    type: 'short',
    text: 'Красота и здоровье изнутри',
  },
  {
    page: 'about',
    key: 'about.image2.src',
    label: 'О нас — изображение 2 (URL)',
    type: 'short',
    text: '/images/o-nas/nutrition.jpg',
  },
  {
    page: 'about',
    key: 'about.image2.alt',
    label: 'О нас — изображение 2 alt',
    type: 'short',
    text: 'Питание и здоровый образ жизни',
  },

  // Каталог — шрифт названий категорий (главная + страница каталога)
  {
    page: 'catalog',
    key: 'categories.fontVariant',
    label: 'Шрифт названий категорий',
    type: 'short',
    text: 'display',
  },

  // Контакты
  {
    page: 'contacts',
    key: 'contacts.phone',
    label: 'Контакты — телефон',
    type: 'short',
    text: '+7 (989) 103-91-92',
  },
  {
    page: 'contacts',
    key: 'contacts.email',
    label: 'Контакты — email',
    type: 'short',
    text: 'innerhealth@mail.ru',
  },
  {
    page: 'contacts',
    key: 'contacts.address',
    label: 'Контакты — адрес шоурума',
    type: 'short',
    text: 'г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис Inner Health',
  },
  {
    page: 'contacts',
    key: 'contacts.working_weekdays',
    label: 'Контакты — режим будни',
    type: 'short',
    text: 'Будние дни: с 10 до 22',
  },
  {
    page: 'contacts',
    key: 'contacts.working_weekends',
    label: 'Контакты — режим выходные',
    type: 'short',
    text: 'Выходные: с 12 до 18',
  },
  {
    page: 'contacts',
    key: 'contacts.working_note',
    label: 'Контакты — примечание к режиму',
    type: 'short',
    text: '*по предварительному звонку',
  },

  // Footer — юридический блок
  {
    page: 'footer',
    key: 'footer.legal.fullName',
    label: 'Футер — полное наименование',
    type: 'short',
    text: 'ИП Кудимов Валерий Валерьевич',
  },
  {
    page: 'footer',
    key: 'footer.legal.address',
    label: 'Футер — юридический адрес',
    type: 'short',
    text: '196140, г. Санкт-Петербург, Пулковское шоссе, д. 73, корп. 2, стр. 1, кв. 85',
  },
  {
    page: 'footer',
    key: 'footer.bank.correspondentAccount',
    label: 'Футер — корреспондентский счёт',
    type: 'short',
    text: '30101 810 4 0000 0000225',
  },
  {
    page: 'footer',
    key: 'footer.bank.bic',
    label: 'Футер — БИК',
    type: 'short',
    text: '044525225',
  },
  {
    page: 'footer',
    key: 'footer.bank.ogrnip',
    label: 'Футер — ОГРНИП',
    type: 'short',
    text: '322784700221371',
  },
  {
    page: 'footer',
    key: 'footer.bank.inn',
    label: 'Футер — ИНН',
    type: 'short',
    text: '550622300904',
  },
]

