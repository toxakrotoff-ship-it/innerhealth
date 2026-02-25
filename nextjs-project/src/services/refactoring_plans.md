Sprint 1: Data Access Layer (DAL) Implementation

Цель: Изолировать Prisma от UI и API-роутов. Защитить серверный код от попадания на клиент.

Как использовать в Cursor: Отметь папку src/app/api/ и src/lib/. Отправь промпт:
Markdown

# Role: Senior Next.js Backend Developer
# Task: Implement Data Access Layer (DAL)

Analyze the current API routes in `src/app/api/` and Prisma usage in `src/lib/`. 
Your goal is to extract all database operations into a dedicated Service Layer to ensure separation of concerns.

1. **Create Services:** Create `src/services/` (e.g., `product.service.ts`, `order.service.ts`, `user.service.ts`).
2. **Move Logic:** Move all `prisma.model.find...` and `prisma.model.create...` logic from API routes and Server Actions into these services.
3. **API as Wrappers:** Refactor API routes to only handle HTTP request parsing (extracting params/body) and returning HTTP responses. They must call the new Service methods for any data manipulation.
4. **Security:** Add the `server-only` package to the top of every file in `src/services/` to prevent accidental client-side bundling.
5. **No Any:** Ensure all service methods have strict TypeScript return types based on Prisma generated types.

Sprint 2: Security Hardening & Admin Auth

Цель: Закрыть уязвимости, добавить строгую валидацию входящих данных и проверку прав доступа.

Как использовать в Cursor: Отметь src/app/api/admin/, src/lib/totp.ts и src/lib/auth.ts.
Markdown

# Role: Application Security Engineer
# Task: Security Hardening for Admin API and Auth

Audit and refactor the Admin API routes and authentication utilities.

1. **Input Validation:** Implement `zod` validation for `req.json()` payloads in EVERY `POST`, `PATCH`, and `PUT` route inside `src/app/api/admin/`. Reject invalid payloads with a 400 status code before reaching the Service layer.
2. **Strict RBAC:** Ensure every route in `src/app/api/admin/` explicitly checks `session.user.role === 'ADMIN'`. Do not rely solely on middleware if it's not strictly covering all endpoints.
3. **Crypto Security:** In `src/lib/totp.ts`, ensure `crypto.timingSafeEqual` is used when comparing 2FA codes or tokens to prevent timing attacks.
4. **Rate Limiting:** Verify that `lib/rate-limit.ts` is applied to sensitive endpoints (e.g., `/api/auth/verify-2fa`, `/api/auth/login-step1`).

Sprint 3: Client Optimization & RSC (React Server Components)

Цель: Уменьшить размер JS-бандла, перенести фетчинг на сервер, убрать лишние ререндеры.

Как использовать в Cursor: Отметь src/components/site/ и src/store/cart-store.ts.
Markdown

# Role: Frontend Performance Expert
# Task: RSC Optimization and Bundle Reduction

Refactor the frontend components for Next.js 16+ App Router performance.

1. **Maximize RSC:** Identify components in `src/components/site/` that use `'use client'` unnecessarily. Remove `'use client'` and refactor them into React Server Components if they only fetch data and render UI without interactivity.
2. **Dynamic Imports:** For heavy interactive components (e.g., Yandex Maps, rich text editors), use `next/dynamic` with `ssr: false` to keep them out of the initial bundle.
3. **Zustand Optimization:** Review `src/store/cart-store.ts`. Ensure the persist middleware is only saving minimal necessary data (e.g., `id`, `quantity`) to `localStorage`, not the entire product JSON objects.
4. **Data Fetching:** Replace any `useEffect` data fetching with direct Server Component async/await fetching or Server Actions.

Sprint 4: Database Payload & Type Safety

Цель: Снизить нагрузку на БД и память VPS за счет выборки только нужных полей (особенно для JSON с фото).

Как использовать в Cursor: Отметь prisma/schema.prisma и новые сервисы src/services/.
Markdown

# Role: Database & TypeScript Architect
# Task: Prisma Optimization and Type Safety

Optimize database queries to reduce VPS memory load and ensure 100% type safety.

1. **Selective Querying:** In `src/services/product.service.ts` (and similar), refactor `prisma.product.findMany` calls. Use the `select` operator to fetch ONLY required fields. 
   *CRITICAL:* For lists/catalogs, do not fetch the entire `photos` Json array. Fetch only the first photo or specific required metadata.
2. **Indexing:** Review `prisma/schema.prisma`. Add `@@index` to frequently queried fields that are missing them (e.g., `slug`, `status`, `tildaUid` if used in sync scripts).
3. **Centralized Types:** Create `src/types/index.ts`. Export shared frontend/backend interfaces (e.g., standardized `CartItem`, `ProductCardDTO`).
4. **Eradicate 'any':** Scan the codebase for `any` and replace them with strict types or generics.

Sprint 5: Local Image & Asset Optimization (No S3)

Цель: Ускорить отдачу 200 локальных фото без перегрузки CPU сервера при ресайзе.

Как использовать в Cursor: Отметь next.config.ts, api/admin/products/upload-image/route.ts и src/components/site/product-card.tsx.
Markdown

# Role: Next.js Performance Engineer
# Task: Local Image Delivery Optimization

Since images are stored locally (<200 images), optimize the upload pipeline and client delivery to prevent VPS CPU spikes.

1. **Upload Processing:** Refactor `upload-image/route.ts`. Integrate the `sharp` library to automatically resize and compress uploaded images to WebP (max width 1920px) BEFORE saving them to disk. Generate a small base64 placeholder and save it to the DB `photos` JSON.
2. **Next Image Config:** Ensure `next.config.ts` is configured to output modern formats (`formats: ['image/avif', 'image/webp']`).
3. **Client Delivery:** In `product-card.tsx` and `gallery-block.tsx`:
   - Enforce the use of `<Image />` from `next/image`.
   - Add the `sizes` attribute strictly (e.g., `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`).
   - Use `priority={true}` ONLY for above-the-fold images (e.g., first 2 products).
   - Apply `placeholder="blur"` using the generated base64 strings.