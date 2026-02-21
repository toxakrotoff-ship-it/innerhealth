# 📜 Technical Specification: InnerHealth.ru Core

## 1. Project Role & Stack
**Role:** Senior Fullstack Developer.
**Goal:** Initialize the core architecture for InnerHealth.ru, including database, migration tools, and admin functionality.

**Tech Stack:**
- **Framework:** Next.js 15+ (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS + Shadcn/ui
- **Typography:** Montserrat (Global font)
- **Auth:** NextAuth.js v5 + 2FA
- **Integrations:** CDEK (Logistics), Yookassa (Payments)

---

## 2. Prisma Database Schema



```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  WRITER
  ADMIN
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  password        String
  name            String?
  role            Role      @default(USER)
  twoFactorSecret String?
  is2FAEnabled    Boolean   @default(false)
  orders          Order[]
  createdAt       DateTime  @default(now())
}

model Product {
  id               String   @id @default(cuid())
  externalId       String?  @unique // ID from Tilda CSV
  sku              String?  @unique
  name             String
  slug             String   @unique
  description      String   @db.Text
  
  // Pricing & Promo Logic
  price            Decimal  @db.Decimal(10, 2)
  discountPrice    Decimal? @db.Decimal(10, 2) 
  isPromoEligible  Boolean  @default(true)      
  
  // Media & Inventory
  images           String[] // Array of local paths: /uploads/products/...
  stock            Int      @default(0)
  isHidden         Boolean  @default(false)
  tags             String[]
  
  // Logistics (CDEK requirements)
  weight           Int?     // grams
  width            Int?     // mm
  height           Int?     // mm
  length           Int?     // mm
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Order {
  id              String      @id @default(cuid())
  status          OrderStatus @default(PENDING)
  totalAmount     Decimal     @db.Decimal(10, 2)
  paymentId       String?     // Yookassa transaction ID
  cdekData        Json?       // Tariff, Point of delivery ID, Tracking number
  userName        String
  userEmail       String
  userPhone       String
  userId          String?
  user            User?       @relation(fields: [userId], references: [id])
  createdAt       DateTime    @default(now())
}

model Post {
  id           String   @id @default(cuid())
  title        String
  slug         String   @unique
  content      Json     // TipTap / JSON format
  previewImage String?
  published    Boolean  @default(false)
  createdAt    DateTime @default(now())
}

model PromoCode {
  id              String   @id @default(cuid())
  code            String   @unique
  discountPercent Int
  isActive        Boolean  @default(true)
  expiresAt       DateTime?
}

## 3. Core Business Logic
3.1. Promo Code Rules

    Rule A: If discountPrice != null, the item is already on sale. Promo codes MUST NOT apply.

    Rule B: If isPromoEligible == false, Promo codes MUST NOT apply.

    Rule C: Promo codes apply ONLY when discountPrice == null AND isPromoEligible == true.

3.2. Migration & Scraping (Tilda Bypass)

    CSV Bulk Import:

        Source: /docs/store-6292080-202602140043.csv.

        Critical: Download images from Tilda URLs -> Save to public/uploads/products/ -> Use local paths in DB.

    URL Scraper (Single Product):

        Tool: cheerio.

        Selectors:

            Name: .js-store-prod-name

            Price: .js-store-prod-price-val (extract numeric value)

            Description: .js-store-prod-all-text

            Images: img.js-product-img (take data-original attribute).

            Tabs/Details: Parse .t-store__tabs__item (Title: data-tab-title, Content: .t-store__tabs__content).

4. UI/UX & Design System
4.1. Visuals

    Font: Montserrat (Global). Use next/font/google, weight 300-800.

    Components: Shadcn/ui (Table, Tabs, Button, Input, Dialog, Card).

    Editor: TipTap for Product descriptions and Blog posts.

4.2. Admin Panel Features

    Path: /${process.env.ADMIN_SECRET_PATH}.

    Security: NextAuth v5 + Credentials Provider + 2FA (Email code/App).

    Product Management: - Inline editing for price and stock in the data table.

        Image gallery with Drag-and-Drop sorting.

        Category assignment.

5. Implementation Roadmap for Cursor

    Step 1: Fix Workspace & Prisma

        Clean node_modules.

        Create src/lib/prisma.ts (Singleton).

        Sync DB: npx prisma db push.

    Step 2: Initialize Design

        Setup Montserrat in layout.tsx and tailwind.config.ts.

        Install Shadcn base components.

    Step 3: Build Importer

        Create a Server Action/Script to process the CSV.

        Implement the fetch and fs logic to save images locally.

    Step 4: Build Admin & Scraper

        Create the hidden Admin layout.

        Implement the URL scraper using cheerio.

    Step 5: Apply Logic

        Implement the price calculation logic in the shopping cart (check discountPrice vs PromoCode).