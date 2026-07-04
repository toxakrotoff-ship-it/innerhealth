import { describe, expect, it } from 'vitest'
import {
  getCategoryCardImageAlt,
  getCategoryHeroBannerAlt,
  getInnerHealthHeroPortraitAlt,
  getMarketingBentoTileImageAlt,
  getPostPreviewImageAlt,
  getReviewAttachmentAlt,
} from '@/lib/image-alt-text'

describe('image-alt-text', () => {
  it('builds neutral category card alts from titles', () => {
    expect(getCategoryCardImageAlt('Коллаген')).toBe(
      'Иллюстрация раздела каталога «Коллаген»'
    )
  })

  it('builds category hero banner alts without medical wording', () => {
    expect(getCategoryHeroBannerAlt('Коллаген', 'Inner Health')).toBe(
      'Баннер раздела «Коллаген — Inner Health»'
    )
  })

  it('builds post preview alts from editorial titles', () => {
    expect(getPostPreviewImageAlt('Новая линейка')).toBe(
      'Превью публикации «Новая линейка»'
    )
  })

  it('builds marketing bento alts from tile titles', () => {
    expect(getMarketingBentoTileImageAlt('Вкусы')).toBe('Иллюстрация: Вкусы')
  })

  it('uses brand-only hero portrait alt', () => {
    expect(getInnerHealthHeroPortraitAlt()).toContain('Inner Health')
    expect(getInnerHealthHeroPortraitAlt().toLowerCase()).not.toMatch(
      /леч|болезн|терап|профилактик/
    )
  })

  it('builds review attachment alts from author names', () => {
    expect(getReviewAttachmentAlt('Анна')).toBe('Изображение к отзыву от Анна')
  })
})
