# Реализация категорий — где в коде

Спецификация и статус разделов каталога: **[categories.md](./categories.md)**. Ниже — расположение в коде и технические детали.

## Структура файлов

```
nextjs-project/
├── src/
│   └── app/
│       └── admin/
│           ├── catalog/
│           │   ├── actions.ts                 # Серверные действия для категорий
│           │   ├── categories/
│           │   │   └── page.tsx              # Страница управления категориями
│           │   ├── components/
│           │   │   └── CategorySidebar.tsx   # Фильтр по категориям
│           │   └── page.tsx                  # Главная страница каталога
│           └── products/
│               ├── components/
│               │   └── CategoryMultiSelect.tsx
│               ├── new/
│               │   └── page.tsx
│               └── [id]/
│                   └── edit/
│                       └── page.tsx
├── scripts/
│   └── seed-categories.ts
└── prisma/
    └── schema.prisma
```

## Технические детали

- Связь Product–Category: модель `ProductCategory` (productId, categoryId), многие-ко-многим.
- При создании/обновлении товара передаётся массив `categoryIds`; сервер обновляет связи в `ProductCategory`.

## Запуск

1. Миграции: `npx prisma migrate dev --name add_categories`
2. Seed категорий: `npm run seed:categories`
3. Приложение: `npm run dev`

## Маршруты

- Управление категориями: `/admin/catalog/categories`
- Каталог: `/admin/catalog`
- Создание/редактирование товара: `/admin/products/new`, `/admin/products/[id]/edit`
