# PR-1: Managed SEO Infrastructure

## Что добавлено

- `Product` публично использует существующие поля `seoTitle`, `seoDescr`, `seoKeywords`, `fbTitle`, `fbDescr`.
- `Category` расширена полями:
  - `pageTitle`
  - `seoTitle`
  - `seoDescription`
  - `seoKeywords`
  - `imageAlt`
  - `isPublished`
- Для контентных страниц `about`, `b2b`, `sotrudnichestvo`, `contacts`, `certificates`, `faq` SEO теперь управляется через `ContentBlock` keys:
  - `seo.title`
  - `seo.description`
  - `seo.ogImage`

## Fallback-логика

### Product

- `title`: `seoTitle` -> `title`
- `description`: `seoDescr` -> очищенный `description` -> безопасный storefront fallback
- `og:title`: `fbTitle` -> `seoTitle` -> `title`
- `og:description`: `fbDescr` -> `seoDescr` -> итоговый `description`
- `canonical`: `/product/{slug}`

### Category

- `H1`: `pageTitle` -> `title`
- `metadata title`: `seoTitle` -> `pageTitle` -> `title`
- `metadata description`: `seoDescription` -> plain text из `linePageBodyRichJson` -> legacy category content -> стандартный fallback
- `image alt`: `imageAlt` -> существующий helper -> `pageTitle` -> `title`
- `canonical`: `/catalog/{slug}`

## Публикация

- `Product.isDraft = true` исключает товар из SEO-метаданных и sitemap; публичная карточка отдает `notFound()`.
- `Category.isPublished = false` скрывает страницу категории, убирает ее из публичных списков и sitemap.

## После деплоя

1. Применить миграции Prisma.
2. Выполнить `prisma generate`.
3. Проверить `/admin/catalog/categories` и `/admin/content` для обоих брендов.
4. Пересохранить измененные категории/контентные страницы при необходимости для принудительной ревалидации.
