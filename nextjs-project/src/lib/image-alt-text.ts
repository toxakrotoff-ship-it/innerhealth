/**
 * Neutral storefront image alt text (no medical or therapeutic claims).
 */

export function getCategoryCardImageAlt(categoryTitle: string): string {
  const title = categoryTitle.trim()
  if (!title) return 'Иллюстрация раздела каталога'
  return `Иллюстрация раздела каталога «${title}»`
}

export function getCategoryHeroBannerAlt(
  heroTitle?: string | null,
  heroSubtitle?: string | null
): string {
  const parts = [heroTitle, heroSubtitle].map((part) => part?.trim()).filter(Boolean)
  if (parts.length > 0) {
    return `Баннер раздела «${parts.join(' — ')}»`
  }
  return 'Баннер раздела каталога'
}

export function getPostPreviewImageAlt(postTitle: string): string {
  const title = postTitle.trim()
  if (!title) return 'Превью публикации'
  return `Превью публикации «${title}»`
}

export function getMarketingBentoTileImageAlt(tileTitle: string): string {
  const title = tileTitle.trim()
  if (!title) return 'Иллюстрация в блоке каталога'
  return `Иллюстрация: ${title}`
}

export function getInnerHealthHeroPortraitAlt(): string {
  return 'Декоративная иллюстрация на главной странице Inner Health'
}

export function getSprintPowerHomePromoAlt(): string {
  return 'Фоновое изображение главной страницы Sprint Power'
}

export function getSprintPowerMockupAlt(): string {
  return 'Визуал линейки Sprint Power'
}

export function getInnerHealthCrossBrandVisualAlt(): string {
  return 'Визуал бренда Inner Health'
}

export function getReviewAttachmentAlt(authorName: string): string {
  const name = authorName.trim()
  if (!name) return 'Изображение к отзыву'
  return `Изображение к отзыву от ${name}`
}
