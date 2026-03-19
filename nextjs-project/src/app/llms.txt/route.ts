import { getSiteBaseUrl } from '@/lib/site-url'

/**
 * llms.txt-style discovery file for AI crawlers (dynamic origin from NEXT_PUBLIC_SITE_URL).
 * @see https://llmstxt.org/
 */
export async function GET(): Promise<Response> {
  const base = getSiteBaseUrl()

  const body = `# Inner Health

> Интернет-магазин нутриентов, коллагена и продуктов для здоровья (Россия).

## Основные разделы
- ${base}/ — главная
- ${base}/catalog — каталог
- ${base}/news — новости и статьи (единый URL для публикаций)
- ${base}/informaciya — статьи и ссылки на SEO-хабы (/guides/…)
- ${base}/rss.xml — RSS-лента публикаций (новости и статьи)
- ${base}/faq — вопросы и ответы
- ${base}/contacts — контакты

## Для ИИ-поиска и цитирования
Публичные витринные страницы можно кратко пересказывать и цитировать с указанием источника.
Не использовать для обучения и индексации как основной контент: /admin, /api, /account, /login, /register, /cart, /wishlist, /compare.

## Структурированные данные
Страницы новостей и статей содержат JSON-LD (WebPage + NewsArticle/Article) с полным текстом в articleBody для машинного разбора.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
