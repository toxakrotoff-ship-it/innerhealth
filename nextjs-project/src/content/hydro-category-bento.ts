/**
 * Единая точка настройки bento-блока для `/catalog/hydro` (Sprint Power).
 * Здесь задаются и тексты, и пути к картинкам (`/images/...` = файлы в `public/images/...`).
 * Чтобы поменять подпись под заголовком — поле `body`; картинку — `imageSrc` (и файл в `public`).
 */
export interface HydroCategoryBentoTile {
  readonly id: string
  readonly title: string
  readonly body?: string
  /** Путь от корня сайта, например `/images/catalog/hydro-bento/01-taste.png`. */
  readonly imageSrc?: string
}

export const HYDRO_CATEGORY_BENTO_TILES: readonly HydroCategoryBentoTile[] = [
  {
    id: 'taste',
    title: 'Приятный вкус',
    imageSrc: '/images/catalog/hydro-bento/01-taste.png',
  },
  {
    id: 'glucose',
    title: 'Помогает регулировать уровень сахара в крови',
    imageSrc: '/images/catalog/hydro-bento/02-glucose.png',
  },
  {
    id: 'immune',
    title: 'Устраняет симптомы угнетения иммунитета',
    imageSrc: '/images/catalog/hydro-bento/03-immune.png',
  },
  {
    id: 'absorption',
    title: 'Обладает максимальной скоростью усвоения',
    imageSrc: '/images/catalog/hydro-bento/04-absorption.png',
  },
  {
    id: 'ldl',
    title: 'Снижает содержание в крови гликопротеинов низкой плотности',
    imageSrc: '/images/catalog/hydro-bento/05-ldl.png',
  },
  {
    id: 'glycogen',
    title: 'Более быстрое восполнение запасов гликогена',
    imageSrc: '/images/catalog/hydro-bento/06-glycogen.png',
  },
  {
    id: 'insulin',
    title: 'Более высокая способность стимулировать секрецию инсулина',
    imageSrc: '/images/catalog/hydro-bento/07-insulin.png',
  },
  {
    id: 'tolerance',
    title: 'Лучшая переносимость',
    imageSrc: '/images/catalog/hydro-bento/08-tolerance.png',
  },
]
