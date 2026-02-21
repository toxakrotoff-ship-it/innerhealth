/**
 * Generates a URL-safe slug from a string (e.g. product title).
 * Cyrillic is transliterated to Latin, then lowercased and hyphenated.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  А: 'a', Б: 'b', В: 'v', Г: 'g', Д: 'd', Е: 'e', Ё: 'e', Ж: 'zh', З: 'z',
  И: 'i', Й: 'y', К: 'k', Л: 'l', М: 'm', Н: 'n', О: 'o', П: 'p', Р: 'r',
  С: 's', Т: 't', У: 'u', Ф: 'f', Х: 'h', Ц: 'ts', Ч: 'ch', Ш: 'sh', Щ: 'sch',
  Ъ: '', Ы: 'y', Ь: '', Э: 'e', Ю: 'yu', Я: 'ya',
}

function transliterate(str: string): string {
  return str.split('').map((char) => CYRILLIC_TO_LATIN[char] ?? char).join('')
}

export function slugify(title: string): string {
  if (!title || typeof title !== 'string') return ''
  const transliterated = transliterate(title.trim())
  const slug = transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'product'
}

/**
 * Ensures unique slug by appending a number if the base slug is taken.
 */
export function slugifyUnique(baseSlug: string, existingSlugs: string[]): string {
  const set = new Set(existingSlugs.map((s) => s.toLowerCase()))
  let slug = baseSlug
  let counter = 1
  while (set.has(slug.toLowerCase())) {
    slug = `${baseSlug}-${counter}`
    counter += 1
  }
  return slug
}
