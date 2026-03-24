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

  // Сотрудничество
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.title',
    label: 'Сотрудничество — заголовок страницы',
    type: 'short',
    text: 'Сотрудничество',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.subtitle',
    label: 'Сотрудничество — подзаголовок страницы',
    type: 'short',
    text: 'Inner Health: внешние трансформации через красоту изнутри',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.form.title',
    label: 'Сотрудничество — заголовок блока формы',
    type: 'short',
    text: 'Оставить заявку',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.form.subtitle',
    label: 'Сотрудничество — подпись блока формы',
    type: 'short',
    text: 'Заполните форму — мы свяжемся с вами и обсудим условия сотрудничества.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.intro.title',
    label: 'Сотрудничество — секция вступления (заголовок)',
    type: 'short',
    text: 'Вступайте в команду Inner Health!',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.intro.p1',
    label: 'Сотрудничество — секция вступления (абзац 1)',
    type: 'short',
    text: 'Объединяем тех, кто точно знает, что молодость и красота – физическое проявление внутреннего здоровья.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.intro.p2',
    label: 'Сотрудничество — секция вступления (абзац 2)',
    type: 'short',
    text: 'В основе разработок наших препаратов — знание физиологии, научные исследования, превентивная практика, передовые технологии и контроль качества.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.intro.p3',
    label: 'Сотрудничество — секция вступления (абзац 3, акцент)',
    type: 'short',
    text: 'Эффективные формулы. Максимальная биодоступность. Бескомпромиссный результат. Пролонгированное действие.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.audience.title',
    label: 'Сотрудничество — секция “С кем работаем” (заголовок)',
    type: 'short',
    text: 'С кем мы работаем',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.audience.text',
    label: 'Сотрудничество — секция “С кем работаем” (текст)',
    type: 'short',
    text: 'Сотрудничаем с врачами, нутрициологами, health-coach, специалистами помогающих профессий, фитнес-тренерами, косметологами.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.benefits.title',
    label: 'Сотрудничество — секция “Вы получите” (заголовок)',
    type: 'short',
    text: 'Вы получите',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.benefits.item1',
    label: 'Сотрудничество — секция “Вы получите” (пункт 1)',
    type: 'short',
    text: 'Скидка до 25% по личному промокоду для вас, ваших клиентов, пациентов, друзей и знакомых.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.benefits.item2',
    label: 'Сотрудничество — секция “Вы получите” (пункт 2)',
    type: 'short',
    text: 'Ежемесячный кешбэк от суммы заказа по промокоду — выплачивается по результатам месяца на вашу банковскую карту.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.benefits.item3',
    label: 'Сотрудничество — секция “Вы получите” (пункт 3)',
    type: 'short',
    text: 'Выгодные условия для оптовых закупок и работы представительств в регионах.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.extra.title',
    label: 'Сотрудничество — секция “А также” (заголовок)',
    type: 'short',
    text: 'А также',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.extra.item1',
    label: 'Сотрудничество — секция “А также” (пункт 1)',
    type: 'short',
    text: 'Есть интересные кейсы применения наших продуктов и вы готовы ими делиться — предоставим свои информационные ресурсы.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.extra.item2',
    label: 'Сотрудничество — секция “А также” (пункт 2)',
    type: 'short',
    text: 'Интересно апробировать в профилактических и терапевтических протоколах и есть возможность фиксировать результат — обсудим и предоставим особые условия на приобретение продукции.',
  },
  {
    page: 'sotrudnichestvo',
    key: 'cooperation.extra.item3',
    label: 'Сотрудничество — секция “А также” (пункт 3)',
    type: 'short',
    text: 'Изучаете рынок продуктов для здоровья и делаете обзоры в соцсетях — расскажем о преимуществах и предоставим продукты на тестирование.',
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

  // Sprint home (brand-scoped page values)
  {
    page: 'home',
    key: 'sprint.hero.badge',
    label: 'Sprint — Hero бейдж',
    type: 'short',
    text: 'SPRINT POWER',
  },
  {
    page: 'home',
    key: 'sprint.hero.title',
    label: 'Sprint — Hero заголовок',
    type: 'short',
    text: 'Почувствуй разницу с первой тренировки',
  },
  {
    page: 'home',
    key: 'sprint.hero.subtitle',
    label: 'Sprint — Hero подзаголовок',
    type: 'short',
    text: 'Научные формулы для силы, восстановления и защиты суставов. Без лактозы. Без компромиссов.',
  },
  {
    page: 'home',
    key: 'sprint.hero.cta.primary',
    label: 'Sprint — Hero кнопка 1',
    type: 'short',
    text: 'Выбрать продукт',
  },
  {
    page: 'home',
    key: 'sprint.hero.cta.secondary',
    label: 'Sprint — Hero кнопка 2',
    type: 'short',
    text: 'Читать отзывы',
  },
  {
    page: 'home',
    key: 'sprint.hero.featured',
    label: 'Sprint — Hero подпись к карточке',
    type: 'short',
    text: 'Hydro Protein - флагман линейки',
  },
  {
    page: 'home',
    key: 'sprint.hits.title',
    label: 'Sprint — заголовок хитов',
    type: 'short',
    text: 'Хиты продаж',
  },
  {
    page: 'home',
    key: 'sprint.reviews.title',
    label: 'Sprint — заголовок отзывов',
    type: 'short',
    text: 'Отзывы спортсменов',
  },
  {
    page: 'home',
    key: 'sprint.markers.title',
    label: 'Sprint — заголовок маркеров',
    type: 'short',
    text: 'Доверительные маркеры',
  },
  {
    page: 'home',
    key: 'sprint.markers.item1',
    label: 'Sprint — маркер 1',
    type: 'short',
    text: 'GMP и HACCP стандарты',
  },
  {
    page: 'home',
    key: 'sprint.markers.item2',
    label: 'Sprint — маркер 2',
    type: 'short',
    text: 'Прозрачный состав',
  },
  {
    page: 'home',
    key: 'sprint.markers.item3',
    label: 'Sprint — маркер 3',
    type: 'short',
    text: 'Регулярные обзоры',
  },
  {
    page: 'home',
    key: 'sprint.lineup.title',
    label: 'Sprint — заголовок линейки',
    type: 'short',
    text: 'Вся линейка',
  },
  {
    page: 'home',
    key: 'sprint.inner.title',
    label: 'Sprint — cross-brand заголовок',
    type: 'short',
    text: 'Inner Health',
  },
  {
    page: 'home',
    key: 'sprint.inner.text',
    label: 'Sprint — cross-brand текст',
    type: 'short',
    text: 'Активное долголетие, превентивная медицина, нутрицевтика.',
  },
  {
    page: 'home',
    key: 'sprint.inner.cta',
    label: 'Sprint — cross-brand кнопка',
    type: 'short',
    text: 'На Inner Health',
  },
  {
    page: 'home',
    key: 'sprint.faq.title',
    label: 'Sprint — FAQ заголовок',
    type: 'short',
    text: 'Частые вопросы',
  },
  {
    page: 'home',
    key: 'sprint.faq.item1',
    label: 'Sprint — FAQ вопрос 1',
    type: 'short',
    text: 'Как выбрать продукт под цель?',
  },
  {
    page: 'home',
    key: 'sprint.faq.item2',
    label: 'Sprint — FAQ вопрос 2',
    type: 'short',
    text: 'Можно ли сочетать протеин и коллаген?',
  },
  {
    page: 'home',
    key: 'sprint.faq.item3',
    label: 'Sprint — FAQ вопрос 3',
    type: 'short',
    text: 'Сколько протеина нужно в день?',
  },
  {
    page: 'home',
    key: 'sprint.faq.cta',
    label: 'Sprint — FAQ кнопка',
    type: 'short',
    text: 'Выбрать продукт сейчас',
  },

  // FAQ page (for sprint brand-scoped editable copy)
  {
    page: 'faq',
    key: 'faq.sprint.subtitle',
    label: 'FAQ Sprint — подзаголовок',
    type: 'short',
    text: 'Ответы на частые вопросы о линейке Sprint Power, приеме продуктов, доставке и заказах.',
  },
  {
    page: 'faq',
    key: 'faq.sprint.q1',
    label: 'FAQ Sprint — вопрос 1',
    type: 'short',
    text: 'Как выбрать продукт Sprint Power под цель тренировки?',
  },
  {
    page: 'faq',
    key: 'faq.sprint.a1',
    label: 'FAQ Sprint — ответ 1',
    type: 'short',
    text: 'Для набора и восстановления выбирайте белковые комплексы, для выносливости — формулы поддержки энергии и электролитов. Начните с базового продукта и отслеживайте самочувствие 2-3 недели.',
  },
  {
    page: 'faq',
    key: 'faq.sprint.q2',
    label: 'FAQ Sprint — вопрос 2',
    type: 'short',
    text: 'Можно ли сочетать несколько продуктов Sprint Power одновременно?',
  },
  {
    page: 'faq',
    key: 'faq.sprint.a2',
    label: 'FAQ Sprint — ответ 2',
    type: 'short',
    text: 'Да, но лучше вводить их поэтапно. Начните с одного продукта, затем добавляйте следующий с интервалом 5-7 дней, чтобы оценить переносимость и эффект.',
  },
  {
    page: 'faq',
    key: 'faq.sprint.q3',
    label: 'FAQ Sprint — вопрос 3',
    type: 'short',
    text: 'Когда принимать продукты: до или после тренировки?',
  },
  {
    page: 'faq',
    key: 'faq.sprint.a3',
    label: 'FAQ Sprint — ответ 3',
    type: 'short',
    text: 'Зависит от формулы: продукты для энергии обычно принимают до тренировки, для восстановления — после. Ориентируйтесь на рекомендации на странице товара.',
  },
  {
    page: 'faq',
    key: 'faq.sprint.q4',
    label: 'FAQ Sprint — вопрос 4',
    type: 'short',
    text: 'Есть ли доставка по России и как быстро приходит заказ?',
  },
  {
    page: 'faq',
    key: 'faq.sprint.a4',
    label: 'FAQ Sprint — ответ 4',
    type: 'short',
    text: 'Да, доставляем по России через СДЭК. Срок зависит от региона и обычно отображается при оформлении заказа.',
  },
]

