Technical Specification: InnerHealth.ru Core
1. Project Role & Stack

Role: Senior Fullstack Developer.
Goal: Initialize the core architecture for InnerHealth.ru, including database, migration tools, and admin functionality.

Tech Stack:

    Framework: Next.js 15+ (App Router)

    Database: PostgreSQL + Prisma ORM

    Styling: Tailwind CSS + Shadcn/ui

    Typography: Montserrat (Global font)

    Auth: NextAuth.js v5 + 2FA

   (Задел на будущее) Integrations: CDEK (Logistics), Yookassa (Payments)


3. Core Business Logic
3.1. Promo Code Rules

    Rule A: Если discountPrice != null (товар уже на скидке), промокоды НЕ применяются.

    Rule B: Если isPromoEligible == false, промокоды НЕ применяются независимо от цены.

    Rule C: Промокоды работают ТОЛЬКО при условии discountPrice == null И isPromoEligible == true.

3.2. Migration & Scraping (Tilda Bypass)

    CSV Bulk Import:

        Источник: /docs/store-6292080-202602140043.csv.

        Критическое действие: Скачивание фото по ссылкам Tilda -> Сохранение в public/uploads/products/ -> Запись локальных путей в БД.

    URL Scraper (Single Product):

        Инструмент: cheerio.

        Селекторы: Название (.js-store-prod-name), Цена (.js-store-prod-price-val), Описание (.js-store-prod-all-text), Табы (.t-store__tabs__item).

4. UI/UX & Design System
4.1. Visuals

    Font: Montserrat (Global). Веса 300-800.

    Components: Shadcn/ui (Table, Tabs, Button, Input, Dialog, Card).

    Editor: TipTap для описаний товаров и новостей.

4.2. Admin Panel Features

    Path: /${process.env.ADMIN_SECRET_PATH}.

    Security: NextAuth v5 + 2FA.

    Архитектура (Две основные ветки):

        Управление каталогом: Полный CRUD товаров, категорий, характеристик и управление складом.

        Новости и публикации: Интерфейс для написания и публикации новостей в блок на главной странице (функционал будет подключен позже).

    Инструментарий:

        Инлайн-редактирование цены и остатка прямо в таблице.

        Галерея изображений с Drag-and-Drop сортировкой.

        Управление SEO-тегами и вкладками (табами) товара.

5. Implementation Roadmap for Cursor / Roo Code
Step 1: Fix Workspace & Prisma

    Очистка node_modules.

    Создание синглтона src/lib/prisma.ts.

    Синхронизация БД: npx prisma db push.

Step 2: Initialize Design

    Настройка Montserrat в layout.tsx и tailwind.config.ts.

    Установка базовых компонентов Shadcn.

Step 3: Build Importer & Scraper

    Создание скрипта для парсинга CSV и локального сохранения изображений.

    Реализация парсера одиночных товаров через cheerio.

Step 4: Build Admin Layout

    Разделение админки на две ветки (Каталог / Новости).

    Создание таблицы товаров с фильтрацией по категориям.

Step 5: Apply Logic

    Реализация расчета корзины с учетом правил промокодов (discountPrice vs PromoCode).