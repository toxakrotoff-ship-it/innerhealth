export interface Bcaa6000InfoCell {
  readonly id: string
  readonly title: string
  readonly body: string
}

export const BCAA6000_INFO_CELLS: readonly Bcaa6000InfoCell[] = [
  {
    id: 'usage',
    title: 'Применение',
    body: 'В период интенсивных физических нагрузок 1 раз в день по 2 капсулы за 30 минут до тренировки и 8 капсул продукта — сразу после тренировки, запивая водой',
  },
  {
    id: 'contraindications',
    title: 'Противопоказания',
    body: 'Индивидуальная непереносимость компонентов продукта',
  },
  {
    id: 'storage',
    title: 'Условия хранения',
    body: 'Хранить в оригинальной закрытой упаковке при температуре от +5°C до +25°C и относительной влажности воздуха не более 85%, в недоступном для детей месте',
  },
  {
    id: 'shelf-life',
    title: 'Срок годности в закрытом виде',
    body: '36 месяцев, при соблюдении условий хранения',
  },
] as const

