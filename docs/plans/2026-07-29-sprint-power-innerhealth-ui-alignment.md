# План: выравнивание Sprint Power по UX Inner Health

**Дата:** 2026-07-29  
**Статус:** согласовано, готово к реализации  
**Цель:** привести Sprint Power к информационной архитектуре, сеткам, типографическим ритмам и паттернам взаимодействия Inner Health, сохранив Sprint Power как отдельный бренд: его палитру, логотип, изображения, каталог, SEO и существующую бизнес-логику.

## Границы

### Меняем

- Общий композиционный каркас публичных экранов Sprint: контейнеры, секционные отступы, заголовки, карточные сетки, CTA-паттерны и адаптивное поведение.
- Представление каталога, страниц категорий и карточки товара, чтобы они использовали одинаковую с Inner Health структуру и плотность интерфейса.
- Sprint-ветку главной: вместо самостоятельной ручной верстки применяем общие секционные примитивы Inner Health с темой Sprint.
- Редактируемые тексты и управляемые параметры Sprint в `content blocks`, включая видимость, порядок, ссылки, изображения и alt-тексты там, где это относится к редакционному содержимому.
- Дробление крупных брендовых веток на небольшие общие/brand-aware компоненты без изменения доменной модели.

### Не меняем

- Палитру Sprint, логотип, изображения и их URL.
- `Product`, `Category`, `Post`, заказы, корзину, оплату, доставку, авторизацию, brand scope и домены.
- Brand scope, SEO URLs и данные существующих категорий/товаров.
- Тексты товарных описаний, tabs и документов до отдельной редакционной ревизии: их источник остаётся в `Product`.

## Текущее состояние

Код уже имеет правильную техническую основу:

- Оба бренда работают в одном Next.js/Prisma приложении; контекст определяется на уровне host/header.
- Общие header, footer, каталог, карточка товара, корзина и аккаунт уже принимают Sprint-тему через `brandId`/`isSprintTheme`.
- `ContentBlock` является brand-scoped, поддерживает `default -> override`, rich text, изображения, ссылки, видимость и переупорядочивание через значения ключей.

Главный источник расхождений: Sprint реализован как отдельная большая ветка в `nextjs-project/src/app/(site)/page.tsx`, а каталог, категории и карточки товара содержат layout-исключения. Поэтому простой перенос CSS не решит задачу: внешний вид выровняется неполно, а управляемый контент останется в коде.

## Целевая архитектура UI

1. **Один набор layout-примитивов.** Используем `AdaptiveContainer`, `FluidGrid`, `ScalableSpacing`, `Heading1/Heading2`, `TiltCard`, `ScrollReveal` для обоих брендов. Различия задаются темой и входными данными, а не двумя копиями разметки.
2. **Одна структура section-компонентов.** Hero, направления каталога, товарные подборки, статьи, новости, отзывы, FAQ teaser и CTA получают общие компоненты с темой `inner | sprint-power`.
3. **Brand theme только для представления.** Sprint продолжает использовать тёмные поверхности, текущие `#060A14`, `#0F172A`, `#7AA2FF` и изображения. Семантические классы/props не должны менять его brand assets.
4. **Контент отделён от верстки.** Все маркетинговые тексты Sprint читаются из `content blocks`; сущности каталога, товаров, FAQ и постов остаются источниками структурированных данных.
5. **Legacy-лендинги обратимо выключены.** Специальные блоки `hydro`, `collagen`, `bcaa6000`, `bonebroth`, `nutrient` не рендерятся на витрине. Поле `Category.showLegacyLinePageBlocks` и контент в БД сохраняются как обратимый резерв.

## Матрица реализации

| Поверхность | Что берём у Inner Health | Что сохраняем у Sprint | Основные файлы |
| --- | --- | --- | --- |
| Общий shell | сетка header/footer, контейнеры, адаптив | logo asset, palette, контакты, nav | `site-header.tsx`, `site-footer.tsx`, `site-branding.ts` |
| Главная | порядок секций, Hero API, directions grid, listing/content section pattern | hero photo, copy, Sprint CTA, cross-brand блок, Sprint posts/reviews | `app/(site)/page.tsx`, `hero-block.tsx`, `inner-home-directions-section.tsx` |
| Каталог | ширина/сетка категорий, subtitle, grid/list controls, product-card routing convention | Sprint theme, brand filter/scope | `app/(site)/catalog/page.tsx` |
| Категория | hero/card/description rhythm, product grid, breadcrumbs | Sprint category data and theme; legacy visual blocks removed | `app/(site)/catalog/[categorySlug]/page.tsx` |
| Товар | media/details composition, documents/tabs/related layout | raw Sprint description/text/tabs semantics, theme | `product-page-content.tsx`, `product-card.tsx` |
| Вторичные страницы | единая типографика, section spacing, forms/cards | Sprint theme и brand copy | `o-nas`, `faq`, `contacts`, `otzyvy`, `sotrudnichestvo`, `b2b`, `news`, `informaciya` |

## Ключи редактирования Sprint

Существующие ключи не переименяются: это предотвращает потерю сохранённых override. Добавляются только недостающие ключи в `src/config/content-blocks-defaults.ts` и `SPRINT_HOME_ADMIN_SCHEMA`.

### Главная

| Группа | Новые ключи |
| --- | --- |
| Управление экраном | `home.sections.order`, `hero.isVisible`, `hero.badge.isVisible`, `hero.subtitle.isVisible`, `hero.description.isVisible`, `hero.cta.isVisible`, `hero.image.isVisible` |
| Hero | `hero.description`, `hero.cta.label`, `hero.cta.href`, `hero.image.src`, `hero.image.alt`, `hero.title.highlight` |
| Направления | полный набор `home.directions.{title,subtitle,cta.*,item1..3.*}`: title, description, categorySlug, href, image.src, image.alt, sortOrder, isVisible |
| Новинки | `home.new.title`, `home.new.subtitle`, `home.new.isVisible` |
| Каталог teaser | `home.catalog.title`, `home.catalog.subtitle`, `home.catalog.cta.label`, `home.catalog.cta.href`, `home.catalog.isVisible` |
| Новости и статьи | `home.news.*`, `home.articles.*`: eyebrow, title, subtitle, cta label/href, showWhenEmpty, isVisible |
| Отзывы | `home.reviews.*`: title, subtitle, CTA title/text/label/href, isVisible |
| FAQ teaser | `home.faq.title`, `home.faq.subtitle`, `home.faq.cta.label`, `home.faq.cta.href`, `home.faq.isVisible` |
| Sprint-only | `home.crossBrand.*`, `home.markers.*`, `home.about.*` только если блок остаётся в утверждённой структуре |

Для ключей изображений используется текущий upload flow админки. Для условных секций применяется явный `*.isVisible`; пустая строка не должна быть скрытым способом выключить секцию. Ссылки проходят текущую серверную проверку внутренних URL.

### Каталог, категория, товар

В первой итерации добавляются только редакционные ключи, не дублирующие сущности:

| Экран | Ключи |
| --- | --- |
| Каталог | `catalog.title`, `catalog.subtitle`, `catalog.categories.isVisible`, `catalog.products.title`, `catalog.products.empty` |
| Категория | контент хранится в `Category`: `pageTitle`, `catalogTeaser`, `image`, `imageAlt`, `linePageBodyRichJson`; не создавать для него дубли в `ContentBlock` |
| Товар | контент хранится в `Product`; оставить `product.documents.placement`, добавить только глобальные labels, если понадобится отдельное редактирование терминов UI |

## План поставки

### Этап 1. Основание и контентная схема

- Ввести theme props/семантические surface-классы в общие section-компоненты.
- Расширить Sprint content schema и defaults без миграции БД: `ContentBlock` уже поддерживает новые ключи.
- Добавить unit tests для resolve-функций Sprint home: default, override, выключенная секция, порядок, ссылки и fallback.

### Этап 2. Главная Sprint

- Заменить монолитный `SprintPowerHome` на конфигурируемый page composition.
- Использовать общую структуру Inner Home; сохранить Sprint palette, hero image, CTA, cross-brand section и Sprint-specific секции.
- Вывести весь редакционный copy из JSX в defaults/blocks.
- Проверить desktop и mobile screenshot/regression tests.

### Этап 3. Каталог и категории

- Выравнять ширины, сетки и category cards с Inner через общие props, сохранив Sprint colors.
- Вернуть подзаголовок категорий и normal card rhythm.
- Направить карточки Sprint в общем каталоге на `/product/[slug]`, как в Inner Health.
- Удалить из публичной верстки legacy category additions `hydro`, `collagen`, `bcaa6000`, `bonebroth`, `nutrient`; записи, флаги и rich content в БД не удалять.

### Этап 4. Товар и общие компоненты

- Выровнять Sprint Product Card и Product Page по иерархии Inner: media, название, цена, availability, actions, description, tabs, documents, recommendations.
- Не менять значения и порядок Sprint `description`, `text`, `tabs` без контентной ревизии.
- Убрать layout-only дубли, оставить только функциональные theme/brand различия.

### Этап 5. Остальной storefront и стабилизация

- Применить section rhythm к about, FAQ, contacts, reviews, cooperation, B2B, news и guides.
- Провести accessibility pass: контраст, keyboard focus, label/alt, touch targets.
- Провести visual regression на двух брендах и функциональный smoke checkout/cart/account.
- Обновить `storefront-copy-ownership.md` и документацию ключей после реализации.

## Критерии приёмки

- Sprint на desktop/mobile следует тому же layout rhythm, что и Inner, но использует только текущие Sprint palette/assets.
- Любой текст Sprint, который относится к маркетинговой секции, CTA, заголовку или подписи и виден на публичной витрине, меняется в `Админка -> Контент` при активном бренде Sprint Power.
- Редактирование Sprint не меняет Inner и наоборот.
- Переходы к товару/категории, корзина, wishlist, quick view, filters, sorting, pagination, account и checkout работают без изменения API-контрактов.
- Sprint category legacy blocks не рендерятся; данные и флаги не удалены и могут быть восстановлены отдельным решением.
- Product `description/text/tabs/documents` остаются видимыми по текущим бизнес-условиям.
- `npm run lint`, unit tests и Playwright visual/adaptive suite проходят для обеих витрин.

## Принятые продуктовые решения

1. Карточка товара Sprint в общем каталоге ведёт на `/product/[slug]`, как в Inner Health.
2. Главная Sprint использует общий каркас Inner Health, но сохраняет Sprint-specific секции, тексты, палитру и изображения.
3. Ключи редактирования Sprint приводятся к модели Inner Health: управляемый storefront copy редактируется в `Админка -> Контент`; товарные, категорийные и постовые данные остаются в своих структурированных моделях.
4. Legacy-блоки категорий `hydro`, `collagen`, `bcaa6000`, `bonebroth`, `nutrient` скрываются из публичной витрины. Данные и флаги сохраняются как обратимый контентный резерв.
