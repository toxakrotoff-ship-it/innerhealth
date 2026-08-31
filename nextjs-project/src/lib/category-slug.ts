/**
 * Replaces Cyrillic characters that are visually indistinguishable from Latin
 * characters. This prevents slugs such as `сrema-i-mazi` (Cyrillic "с") from
 * looking valid in the admin UI while producing a different URL.
 */
const CYRILLIC_CONFUSABLES: Readonly<Record<string, string>> = {
  'а': 'a',
  'в': 'b',
  'е': 'e',
  'к': 'k',
  'м': 'm',
  'н': 'h',
  'о': 'o',
  'р': 'p',
  'с': 'c',
  'т': 't',
  'х': 'x',
  'у': 'y',
}

export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeCategorySlug(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[авекмнорстху]/g, (character) => CYRILLIC_CONFUSABLES[character] ?? character)
}
