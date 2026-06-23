/**
 * Очистка текста товара от разметки Тильды и HTML.
 * Используется для полей: description, text, tab1–tab4, tab1Title–tab4Title.
 * Результат: обычный текст с переносами строк; списки — строки, начинающиеся с "- ".
 */

/**
 * Поля продукта, которые очищаются от Tilda/HTML в API.
 * description, text, tab1–tab4 не входят: в них хранится HTML из TipTap-редактора.
 */
export const PRODUCT_TEXT_FIELDS = [
  'tab1Title',
  'tab2Title',
  'tab3Title',
  'tab4Title',
] as const;

/**
 * Удаляет префикс Тильды: "info|#|Название|#|" или "chars|#|Название|#|" (оставляет контент после второго |#|).
 */
function stripTildaBlockPrefix(value: string): string {
  return value.replace(/^(?:info|chars)\|#\|[^|]*\|#\|/i, '').trim();
}

/**
 * Преобразует HTML в читаемый текст: теги убираются, <br> и блоки дают переносы, списки — строки с "- ".
 */
function htmlToPlainText(html: string): string {
  let s = html;

  // Переносы строк
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // Список: <li ...> содержимое </li> → "- содержимое\n"
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
    const text = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    return text ? `- ${text}\n` : '\n';
  });

  // Блочные теги — перенос после закрытия
  s = s.replace(/<\/p>\s*/gi, '\n');
  s = s.replace(/<\/div>\s*/gi, '\n');
  s = s.replace(/<\/h[1-6]>\s*/gi, '\n');
  s = s.replace(/<\/ul>\s*/gi, '\n');
  s = s.replace(/<\/ol>\s*/gi, '\n');
  s = s.replace(/<\/li>\s*<li/gi, '\n- '); // между </li><li> — новый пункт
  s = s.replace(/<\/tr>\s*/gi, '\n');

  // Удаляем все оставшиеся теги
  s = s.replace(/<[^>]+>/g, '');

  // Сущности
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/&amp;/g, '&');
  s = s.replace(/&lt;/g, '<');
  s = s.replace(/&gt;/g, '>');
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Двойные кавычки в атрибутах (Tilda CSV): "" → "
  s = s.replace(/""/g, '"');

  return s;
}

/**
 * Нормализует пробелы и переносы: подряд идущие \n → максимум 2, обрезка по краям.
 */
function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n')
    .trim();
}

/**
 * Удаляет управляющие и нежелательные символы (используется как доп. шаг).
 */
function stripControlChars(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex -- intentional: strip control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\uFFFD/g, '');
}

/**
 * Санитизация названия таба при вводе в форме: убирает управляющие символы и схлопывает
 * повторяющиеся пробелы, но не обрезает края — иначе пробел между словами пропадает при наборе.
 */
export function sanitizeProductTitleInput(value: string): string {
  if (typeof value !== 'string') return '';
  return stripControlChars(value).replace(/[ \t]{2,}/g, ' ');
}

/**
 * Очищает текст товара от разметки Тильды (info|#|…|#|, chars|#|…|#|) и HTML,
 * возвращает обычный текст с переносами; списки — строки с "- ".
 */
export function sanitizeProductText(value: string): string {
  if (typeof value !== 'string') return '';
  let s = value;
  s = stripTildaBlockPrefix(s);
  s = htmlToPlainText(s);
  s = stripControlChars(s);
  s = normalizeWhitespace(s);
  return s;
}

/**
 * Санитизирует объект с полями продукта: все текстовые поля (PRODUCT_TEXT_FIELDS) очищаются.
 * Для использования в API при создании/обновлении.
 */
export function sanitizeProductTextFields<T extends Record<string, unknown>>(data: T): T {
  const out = { ...data };
  for (const key of PRODUCT_TEXT_FIELDS) {
    if (key in out && typeof out[key] === 'string') {
      (out as Record<string, unknown>)[key] = sanitizeProductText(out[key] as string);
    }
  }
  return out;
}
