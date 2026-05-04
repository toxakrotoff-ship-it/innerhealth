/** Одна плитка маркетингового bento: контент задаётся в data-файле, раскладка — Tailwind-классами сетки. */
export interface MarketingBentoTile {
  readonly id: string
  readonly title: string
  readonly body?: string
  /** Путь от корня сайта, например `/images/catalog/foo/01.png`. */
  readonly imageSrc?: string
}
