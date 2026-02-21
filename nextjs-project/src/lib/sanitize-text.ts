/**
 * Удаляет управляющие и нежелательные символы из текста (описание, табы товара).
 * Разрешает: буквы, цифры, пунктуацию, переносы строк (\n, \r, \t), пробелы.
 */
export function sanitizeProductText(value: string): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\uFFFD/g, '')
    .trim();
}
