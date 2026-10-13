import { stripHtmlToPlainText } from '@/lib/plain-text'

/** Empty rich-text editor paragraphs must not create a visible section. */
export function hasVisibleProductText(value: string | null | undefined): boolean {
  if (!value) return false
  if (/<(?:img|video|audio|iframe|svg)\b/i.test(value)) return true
  return stripHtmlToPlainText(value)
    .replace(/&#(?:160|8203|65279);|&#x(?:a0|200b|feff);/gi, '')
    .replace(/[\u200B\uFEFF]/g, '')
    .trim().length > 0
}

function normalizeRichTextToComparablePlainText(value: string): string {
  return stripHtmlToPlainText(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('ru')
}

export function shouldHideInnerProductDescription(
  description: string | null | undefined,
  text: string | null | undefined
): boolean {
  if (!description?.trim() || !text?.trim()) return false

  const normalizedDescription = normalizeRichTextToComparablePlainText(description)
  const normalizedText = normalizeRichTextToComparablePlainText(text)

  if (!normalizedDescription || !normalizedText) return false

  return normalizedText.startsWith(normalizedDescription)
}
