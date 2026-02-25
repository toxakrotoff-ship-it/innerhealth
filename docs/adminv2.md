Technical Specification: InnerHealth.ru Core

**Текущее состояние реализации:** см. [STATUS.md](./STATUS.md). Реализованы: админка (каталог, товары, категории, новости, промокоды, заказы, пользователи, настройки, модерация отзывов, профиль с Telegram), публичная часть (главная, каталог, карточка товара, корзина, новости, отзывы), импорт CSV, TipTap в новостях и товарах, YooKassa и СДЭК (API), инлайн-редактирование цены/остатка в каталоге, галерея изображений с D&D, правила промокодов (Rule A/B/C) в корзине и заказах. В планах: NextAuth v5 + 2FA.

---

1. Project Role & Stack

Role: Senior Fullstack Developer.
Goal: Initialize the core architecture for InnerHealth.ru, including database, migration tools, and admin functionality.

Tech Stack:

    Framework: Next.js 16 (App Router) — в проекте nextjs-project

    Database: PostgreSQL + Prisma ORM (схема и миграции в nextjs-project/prisma)

    Styling: Tailwind CSS + Shadcn-подобные компоненты

    Typography: Montserrat (глобально в layout.tsx, next/font)

    Auth: NextAuth.js v4 (Credentials, JWT); v5 + 2FA — в планах

    Integrations: YooKassa (оплата), CDEK (доставка) — реализованы API; Telegram-бот — отдельный сервис


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

    Path: маршруты под /admin; в middleware проверка учитывает ADMIN_SECRET_PATH (matcher пока зашит под «admin»). См. STATUS.md.

    Security: NextAuth v4; v5 + 2FA в планах.

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