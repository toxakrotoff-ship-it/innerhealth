# Product Relations Engine

## Что реализовано

- Добавлена Prisma-модель `ProductRelation` и enum `ProductRelationType`.
- Связи направленные: `A -> B`, без автосоздания обратной связи.
- Уникальность: `sourceProductId + targetProductId + relationType`.
- Запрещена self-relation через server validation и SQL `CHECK`.
- В relation хранится явный `brand`, вычисляемый из текущего scope.

## Публичная карточка товара

- Добавлены управляемые секции:
  - `RECOMMENDED` -> `Рекомендуем также`
  - `CROSS_SELL` -> `С этим товаром покупают`
  - `UPSELL` -> `Можно выбрать больше`
  - `ALTERNATIVE` -> `Альтернативные варианты`
  - `BUNDLE` -> `Дополните набор`
  - `RELATED` -> `Похожие товары`
- Секции показываются только для опубликованных связей.
- В публичную выдачу не попадают:
  - draft-товары
  - товары вне текущего brand scope
  - товары без `slug`
- Старый category-based блок похожих товаров остаётся fallback-ом и скрывается, если уже есть ручной `RELATED`.

## Админка

- Добавлен admin API:
  - `GET /api/admin/product-relations`
  - `POST /api/admin/product-relations`
  - `PATCH /api/admin/product-relations`
  - `PUT /api/admin/product-relations`
  - `DELETE /api/admin/product-relations`
  - `GET /api/admin/product-relations/suggest`
- В редактор товара встроен блок управления связями:
  - поиск по названию, `slug`, `SKU`
  - выбор типа связи
  - сортировка
  - публикация/скрытие
  - удаление

## Revalidation

- После CRUD-операций по связям revalidate выполняется для storefront-path товара-источника:
  - `/product/[slug]`

## Миграция и deploy

1. `DATABASE_URL=... npx prisma validate`
2. `DATABASE_URL=... npx prisma generate`
3. `npx prisma migrate deploy`
