import { getSiteBaseUrl } from '@/lib/site-url'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

/**
 * llms.txt-style discovery file for AI crawlers (dynamic origin + copy per brand).
 * @see https://llmstxt.org/
 */
export async function GET(): Promise<Response> {
  const [base, { brandId, siteTitle }] = await Promise.all([getSiteBaseUrl(), getServerBrandContext()])
  const summary = isSprintPowerBrand(brandId)
    ? 'Интернет-магазин спортивного питания, протеина и нутриентов для активной формы (Россия).'
    : 'Интернет-магазин нутриентов, коллагена и продуктов для здоровья (Россия).'

  const body = `# ${siteTitle}

> ${summary}

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
