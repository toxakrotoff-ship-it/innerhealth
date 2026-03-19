/**
 * Strip HTML tags and collapse whitespace for meta descriptions and JSON-LD.
 */
export function stripHtmlToPlainText(html: string, maxLength?: number): string {
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  if (maxLength == null || stripped.length <= maxLength) {
    return stripped
  }
  return `${stripped.slice(0, maxLength - 1).trimEnd()}…`
}
