# Task: Admin Panel & Tilda Migration Tool (Next.js 16)

## 1. Project Context
We are building a custom E-commerce Admin Panel to replace Tilda.
**Stack:** Next.js 16 (App Router), Prisma (PostgreSQL), Tailwind CSS, Shadcn/ui.

## 2. Core Objectives
1.  **Import Data:** Parse existing CSV catalog (`docs/store-6292080-202602140043.csv`) into the Database.
2.  **Scrape Data:** Ability to add new products by pasting a Tilda URL.
3.  **Manage Data:** A "Tilda-like" admin interface for editing products, prices, and stock.
4.  **Security:** Secure the admin panel behind a secret route and authentication.

---

## 3. Implementation Steps

### Step 1: Database Schema (Prisma)
Create a `Product` model in `schema.prisma` that mirrors Tilda's structure but is optimized for Next.js.
* **Fields:**
    * `id` (Int/UUID)
    * `externalId` (String, unique - from Tilda CSV)
    * `sku` (String)
    * `title` (String)
    * `description` (String, supports HTML)
    * `price` (Float)
    * `oldPrice` (Float, nullable - used for discounts)
    * `quantity` (Int)
    * `images` (String[] - array of local paths)
    * `category` (String or Relation)
    * `slug` (String, unique)
* **Best Practice:** Use the Singleton pattern for `PrismaClient` in `src/lib/prisma.ts` to prevent connection exhaustion in dev mode.

### Step 2: CSV Import & Image Handling
Create a script or Server Action to parse `/docs/store-6292080-202602140043.csv`.
* **Parsing:** Use `papaparse` or `csv-parser`.
* **Image Logic (CRITICAL):**
    * The CSV contains URLs to Tilda's servers.
    * **Do not** just save the URL.
    * **Download** every image using `fetch`.
    * **Save** the file to `public/uploads/products/` with a unique name (UUID).
    * **Store** the local path (e.g., `/uploads/products/image-1.jpg`) in the database.

### Step 3: Tilda URL Scraper (Migration Bypass)
Add a button "Import from Tilda URL" in the admin panel.
* **Input:** URL string.
* **Tool:** Use `cheerio` to parse the DOM.
* **Selectors:**
    * Title: `.js-store-prod-name`
    * Price: `.js-store-prod-price-val` (sanitize currency symbols)
    * Description: `.js-store-prod-all-text`
    * Images: Find all `.js-product-img`, download them locally to `public/uploads`, and link to the product.

### Step 4: Admin UI (Shadcn + Tailwind)
Build an interface that mimics the ease of use of Tilda.
* **List View (DataTable):**
    * Columns: Image thumbnail, Title, SKU, Price, Quantity, Actions.
    * **Inline Editing:** Allow changing `Price` and `Quantity` directly in the table row without opening the full editor.
* **Product Editor:**
    * **Rich Text:** Use **TipTap** for the description (support headings, lists, bold).
    * **Media:** Drag-and-drop zone to reorder or upload new images.
    * **Pricing:** Fields for "Price" and "Old Price" (automatically calculates discount % if needed).

### Step 5: Security & Auth
* **Secret Route:** The admin panel must be served under a dynamic route defined in `.env` (e.g., `process.env.ADMIN_SECRET_PATH`).
* **Authentication:** Integrate **NextAuth.js (v5)**.
    * Provider: Credentials (Email/Password).
    * 2FA: Implement a simple 2FA check (Email code or TOTP) before granting session access.

---

## 4. Technical Constraints
* **Directory:** All code must be inside `nextjs-project/`. Do not create files in the root `innerhealth/`.
* **Server Actions:** Use Server Actions for all data mutations (create, update, delete, scrape).
* **Validation:** Use `zod` for all form inputs.