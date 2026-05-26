import { stripHtmlToPlainText } from '@/lib/plain-text'

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
