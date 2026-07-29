# Storefront Copy Ownership

## Purpose

Фиксирует, откуда должен браться текст на storefront, чтобы не появлялись новые hardcoded fallback-ветки мимо админки.

## Ownership Matrix

| Surface | Owner |
| --- | --- |
| Home hero, CTA, section subtitles, Sprint home blocks and directions, `howToOrder.*` | `content blocks` |
| FAQ page title/subtitle and Sprint fallback FAQ copy | `content blocks` |
| Published FAQ entries | `FAQ records` |
| Contacts page headings, labels, address/phone/email/hours | `content blocks` |
| Footer legal/bank block | `content blocks` |
| Brand SEO/meta, sitemap, schema.org, metrika | `settings` / brand SEO modules |
| Product data, category names, article/news titles/excerpts | structured content models (`Product`, `Category`, `Post`, `SeoHub`) |
| Privacy policy (`/privacy`), public offer (`/oferta`), certificates, other legal/static informational pages | **Privacy / Oferta:** `content blocks` pages `legal-privacy` and `legal-oferta`, key `*.body` (rich); пустой блок → кодовый fallback в репозитории. Редактирование: админка → Контент → соответствующая страница. **Certificates** и прочие — по-прежнему см. [two-storefronts-architecture.md](../two-storefronts-architecture.md). |
| Pure system UI copy in cart/compare/wishlist/account flows | `code static` unless explicitly promoted to editable storefront content |

## Rules

- Если текст должен редактироваться из админки и отличаться по брендам, он должен жить в `content blocks` или в отдельной структурированной модели.
- Frontend не должен хранить самостоятельные brand-specific fallback-строки для управляемого текста; fallback должен идти из brand-aware defaults registry.
- Для `content blocks` админка показывает effective value и источник значения (`override`, `brand_default`, `generic_default`).
- Пустой saved override не должен визуально скрывать effective fallback в админке.
- Sprint использует тот же контракт home-ключей, что Inner (`hero.*`, `home.directions.*`, порядок и видимость секций); значения и assets остаются brand-scoped.
