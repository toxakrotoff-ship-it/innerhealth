/** Одна плитка маркетингового bento: контент задаётся в data-файле, раскладка — Tailwind-классами сетки. */
export interface MarketingBentoTile {
  readonly id: string
  readonly title: string
  readonly body?: string
  /** Путь от корня сайта, например `/images/catalog/foo/01.png`. */
  readonly imageSrc?: string
  /**
   * Фокус кадра для `object-fit: cover` (CSS `object-position`), например `50% 30%` или `80% center`.
   * Без значения — центр; в узких плитках иначе часто «съедаются» головы/ноги.
   */
  readonly imageObjectPosition?: string
}
