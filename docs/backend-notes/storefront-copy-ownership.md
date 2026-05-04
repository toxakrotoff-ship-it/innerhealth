# Storefront Copy Ownership

## Purpose

Фиксирует, откуда должен браться текст на storefront, чтобы не появлялись новые hardcoded fallback-ветки мимо админки.

## Ownership Matrix

| Surface | Owner |
| --- | --- |
| Home hero, CTA, section subtitles, Sprint home blocks, `howToOrder.*` | `content blocks` |
| FAQ page title/subtitle and Sprint fallback FAQ copy | `content blocks` |
| Published FAQ entries | `FAQ records` |
| Contacts page headings, labels, address/phone/email/hours | `content blocks` |
| Footer legal/bank block | `content blocks` |
| Brand SEO/meta, sitemap, schema.org, metrika | `settings` / brand SEO modules |
| Product data, category names, article/news titles/excerpts | structured content models (`Product`, `Category`, `Post`, `SeoHub`) |
| Privacy policy, certificates, other legal/static informational pages | **Target:** brand-specific editable copy from **admin** (or content blocks); until implemented, may remain `code static` per [two-storefronts-architecture.md](../two-storefronts-architecture.md) |
| Pure system UI copy in cart/compare/wishlist/account flows | `code static` unless explicitly promoted to editable storefront content |

## Rules

- Если текст должен редактироваться из админки и отличаться по брендам, он должен жить в `content blocks` или в отдельной структурированной модели.
- Frontend не должен хранить самостоятельные brand-specific fallback-строки для управляемого текста; fallback должен идти из brand-aware defaults registry.
- Для `content blocks` админка показывает effective value и источник значения (`override`, `brand_default`, `generic_default`).
- Пустой saved override не должен визуально скрывать effective fallback в админке.
