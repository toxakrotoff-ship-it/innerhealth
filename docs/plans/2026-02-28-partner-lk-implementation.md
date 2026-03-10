# План реализации: ЛК партнёра и ветка авторизации «Партнёры»

> **Для Claude:** при реализации иди по задачам последовательно; при необходимости используй skill executing-plans.

**Цель:** Реализовать третью ветку авторизации — партнёры: ЛК партнёра с промокодами, статистикой и доходом; в админке — вкладка «Пользователи» с фильтром по ролям и блок «Партнёры» для управления промокодами и процентом дохода.

**Архитектура:** Единое окно входа (как для пользователей). Роль `PARTNER` в `Role`. Связь партнёр–промокод через таблицу `PartnerPromoCode` с полем `commissionPercent`. Статистика заказов по промокоду: считаем заказы в статусе `paid` (и при необходимости `completed`). В ЛК партнёра показываем только сухие цифры: кол-во заказов и доход по %; сумму выкупа партнёру не показываем (пока не согласовано с заказчиком).

**Стек:** Next.js App Router, TypeScript, Prisma 7, NextAuth v5, Zod, Tailwind.

---

## Согласованные решения

| Вопрос | Решение |
|--------|--------|
| % дохода | Зависит от промокода → храним **процент на связку партнёр–промокод** (`PartnerPromoCode.commissionPercent`) |
| Создание промокода | Возможность **создать промокод из карточки/раздела партнёра** в админке |
| Статусы заказов для статистики | Учитываем заказы в статусе **`paid`** (при необходимости добавить `completed`) |
| Где ЛК партнёра | **Доп. вкладка/ссылка в ЛК** для пользователей с ролью PARTNER (открывается как отдельная страница `/account/partner`) |
| Что показывать партнёру | Только **сухие цифры**: кол-во заказов по промокоду(ам), **доход по %**. Сумму выкупа **не показывать** |
| Один промокод — один партнёр | Один промокод может быть привязан только к одному партнёру (unique по `promoCodeId` в связке) |

---

## Правила выполнения

- После каждой задачи: `npm run lint` и при необходимости `npx prisma generate` / `npm run build`.
- Коммиты небольшие, по одной задаче.
- Валидация через Zod на границах API; бизнес-логика в `src/services/` и `src/lib/`.
- Не менять логику оформления заказа и применения промокода для покупателей.

---

## Task 1: Схема Prisma — роль PARTNER и связь партнёр–промокод

**Файлы:**
- Изменить: `nextjs-project/prisma/schema.prisma`
- Создать: миграция через `npx prisma migrate dev --name add-partner-role-and-partner-promo`

**Шаги:**

1. В `enum Role` добавить значение `PARTNER` (после `USER`, `WRITER`, `ADMIN`).
2. Создать модель `PartnerPromoCode`:
   - `id` String @id @default(cuid())
   - `userId` String (партнёр)
   - `promoCodeId` String @unique (один промокод — один партнёр)
   - `commissionPercent` Float (процент дохода партнёра по этому промокоду, 0–100)
   - `createdAt` DateTime @default(now())
   - Связи: `user User @relation(...)`, `promoCode PromoCode @relation(...)`
   - @@unique([userId, promoCodeId]) не нужен, достаточно unique на promoCodeId
   - @@index([userId])
3. В модели `User` добавить связь: `partnerPromoCodes PartnerPromoCode[]`.
4. В модели `PromoCode` добавить связь: `partnerAssignment PartnerPromoCode?` (один промокод — одна запись в PartnerPromoCode).
5. Выполнить `npx prisma migrate dev --name add-partner-role-and-partner-promo`, затем `npx prisma generate`.
6. Закоммитить изменения схемы и миграции.

**Промт для реализации:**

```
В nextjs-project/prisma/schema.prisma:
1) Добавь в enum Role значение PARTNER.
2) Создай модель PartnerPromoCode с полями: id (cuid), userId, promoCodeId (unique), commissionPercent (Float), createdAt. Связи: user (User), promoCode (PromoCode). Индекс по userId.
3) В User добавь связь partnerPromoCodes PartnerPromoCode[].
4) В PromoCode добавь связь partnerAssignment PartnerPromoCode?.
После этого выполни prisma migrate dev --name add-partner-role-and-partner-promo и prisma generate.
```

---

## Task 2: Сервис статистики партнёра и привязок промокодов

**Файлы:**
- Создать: `nextjs-project/src/services/partner.service.ts`
- Опционально: тесты в `nextjs-project/src/services/partner.service.test.ts`

**Шаги:**

1. Реализовать функции:
   - `getPartnerStatsByUserId(userId: string)` — для админки: по всем промокодам партнёра вернуть `{ promoCodeId, code, ordersCount, totalAmount }`, считая заказы с `Order.promoCodeId` и `Order.status` в `['paid', 'completed']`, totalAmount = сумма `Order.total`.
   - `getPartnerStatsForPartner(userId: string)` — для ЛК партнёра: по каждому промокоду вернуть `{ promoCodeId, code, ordersCount, partnerIncome }`, где `partnerIncome = totalAmount * (commissionPercent / 100)`. Сумму выкупа (totalAmount) в ответ не включать.
   - `assignPromoCodeToPartner(userId: string, promoCodeId: string, commissionPercent: number)` — создать запись PartnerPromoCode (проверять, что пользователь с ролью PARTNER и промокод ещё не привязан).
   - `updatePartnerPromoCommission(partnerPromoId: string, commissionPercent: number)` — обновить commissionPercent.
   - `removePromoCodeFromPartner(partnerPromoId: string)` — удалить привязку.
   - `getPartnerPromoCodes(userId: string)` — список привязанных промокодов с commissionPercent для админки.
2. Использовать Prisma: агрегации по Order с фильтром по promoCodeId и status.

**Промт для реализации:**

```
Создай nextjs-project/src/services/partner.service.ts. Реализуй:
- getPartnerStatsByUserId(userId): для каждого промокода партнёра — ordersCount и totalAmount по заказам (status in ['paid','completed']).
- getPartnerStatsForPartner(userId): то же, но для ЛК партнёра — только ordersCount и partnerIncome (totalAmount * commissionPercent/100), без totalAmount в ответе.
- assignPromoCodeToPartner(userId, promoCodeId, commissionPercent): создать PartnerPromoCode; проверять роль PARTNER и что промокод не занят.
- updatePartnerPromoCommission(partnerPromoId, commissionPercent), removePromoCodeFromPartner(partnerPromoId), getPartnerPromoCodes(userId).
Используй Prisma, все типы явно.
```

---

## Task 3: API админки — пользователи с ролью PARTNER и статистика

**Файлы:**
- Изменить: `nextjs-project/src/app/api/admin/users/route.ts` (GET: поддержка query `role=PARTNER`, при наличии возвращать для партнёров список промокодов и агрегаты)
- Изменить: `nextjs-project/src/services/user.service.ts` (метод для списка пользователей с опциональным фильтром по роли и при необходимости джойном PartnerPromoCode)
- Создать: `nextjs-project/src/app/api/admin/partners/[userId]/stats/route.ts` (GET — статистика по партнёру: промокоды, ordersCount, totalAmount)
- Создать: `nextjs-project/src/app/api/admin/partners/[userId]/promo-codes/route.ts` (GET — список привязок; POST — привязать промокод с commissionPercent; PATCH/DELETE по id привязки — обновить % или отвязать)

**Шаги:**

1. В GET `/api/admin/users` добавить поддержку query-параметра `role` (USER, WRITER, ADMIN, PARTNER). При `role=PARTNER` в ответ для каждого пользователя с ролью PARTNER добавить поля: `promoCodes: { code, id, commissionPercent }[]`, `ordersCount`, `totalRevenue` (сумма выкупа по всем его промокодам) — через вызов partner.service.
2. Реализовать GET `/api/admin/partners/[userId]/stats`: только для админа; возвращать детальную статистику по партнёру (по каждому промокоду: code, ordersCount, totalAmount).
3. Реализовать GET/POST для `/api/admin/partners/[userId]/promo-codes`: GET — список привязок; POST — body `{ promoCodeId, commissionPercent }`, создание привязки и при необходимости создание промокода (если в ТЗ «создать промокод из раздела партнёра» — тогда POST может принимать либо `promoCodeId`, либо данные для нового промокода).
4. Реализовать PATCH/DELETE для одной привязки: например PATCH `/api/admin/partners/[userId]/promo-codes/[partnerPromoId]` — обновить commissionPercent; DELETE — удалить привязку.

**Промт для реализации:**

```
1) В GET /api/admin/users добавь поддержку query role (USER, WRITER, ADMIN, PARTNER). При role=PARTNER для пользователей с ролью PARTNER добавь в ответ promoCodes (code, id, commissionPercent), ordersCount, totalRevenue (сумма выкупа по его промокодам), используя partner.service.
2) Создай GET /api/admin/partners/[userId]/stats — только для админа, возвращает по каждому промокоду партнёра: code, ordersCount, totalAmount.
3) Создай GET и POST /api/admin/partners/[userId]/promo-codes: GET — список привязок с промокодами и %; POST — body { promoCodeId, commissionPercent } для привязки существующего промокода. Добавь PATCH и DELETE для /api/admin/partners/[userId]/promo-codes/[partnerPromoId]: PATCH — обновить commissionPercent, DELETE — удалить привязку. Везде проверка прав админа и что userId — партнёр.
```

---

## Task 4: API «Создать промокод из раздела партнёра»

**Файлы:**
- Расширить: POST `/api/admin/partners/[userId]/promo-codes` или отдельный эндпоинт
- Использовать существующий API создания промокода или дублировать схему в партнёрском API

**Шаги:**

1. Разрешить в POST `/api/admin/partners/[userId]/promo-codes` кроме `{ promoCodeId, commissionPercent }` также тело вида `{ createPromo: true, code, discountType, discountValue, usageLimit?, validFrom?, validTo?, commissionPercent }`: создать промокод через существующую логику (или вызов сервиса промокодов), затем создать привязку PartnerPromoCode с указанным commissionPercent.
2. Валидация через Zod; код промокода уникален.

**Промт для реализации:**

```
В POST /api/admin/partners/[userId]/promo-codes добавь поддержку создания нового промокода: если в body приходит createPromo: true и поля code, discountType, discountValue (и опционально usageLimit, validFrom, validTo), то сначала создай промокод (используй существующий API или сервис промокодов), затем создай привязку PartnerPromoCode с commissionPercent из body. Валидация Zod, код промокода уникален.
```

---

## Task 5: Админка — вкладка «Пользователи»: фильтр по ролям и колонки для партнёров

**Файлы:**
- Изменить: `nextjs-project/src/app/admin/users/page.tsx`
- При необходимости: типы/интерфейсы в том же файле или в отдельном types-файле

**Шаги:**

1. Над таблицей пользователей добавить фильтр по ролям: выпадающий список или табы (Все / Пользователи / Автор / Админ / Партнёры). При выборе «Партнёры» запрос к API с `?role=PARTNER`.
2. В таблице при отображении партнёров (или при выборе фильтра «Партнёры») добавить колонки: «Промокоды» (список кодов через запятую или чипы), «Кол-во заказов», «Сумма выкупа» (totalRevenue). Колонку «Действия» расширить: кнопка «Настроить партнёра» (переход на страницу партнёра или открытие модалки).
3. В форме создания пользователя в селекте ролей добавить опцию «Партнёр» (PARTNER). В API POST `/api/admin/users` разрешить роль PARTNER (обновить схему Zod и логику).

**Промт для реализации:**

```
На странице nextjs-project/src/app/admin/users/page.tsx:
1) Добавь фильтр по ролям над таблицей (Все, Пользователь, Автор, Админ, Партнёры). При выборе Партнёры — запрос GET /api/admin/users?role=PARTNER.
2) Когда отображаются партнёры (или выбран фильтр Партнёры), добавь в таблицу колонки: Промокоды (список кодов), Кол-во заказов, Сумма выкупа. В Действия добавь кнопку «Настроить партнёра» — переход на /admin/partners/[userId] или открытие модалки управления промокодами.
3) В форму создания пользователя добавь роль «Партнёр» (PARTNER). Убедись, что POST /api/admin/users принимает роль PARTNER (обнови Zod и бэкенд при необходимости).
```

---

## Task 6: Админка — вкладка/страница «Партнёры»

**Файлы:**
- Создать: `nextjs-project/src/app/admin/partners/page.tsx` (список партнёров с краткими статами)
- Создать: `nextjs-project/src/app/admin/partners/[userId]/page.tsx` (управление промокодами одного партнёра: список привязок, добавить промокод, задать %, создать новый промокод)
- Добавить пункт в навигацию админки: «Партнёры» (в `AdminNav.tsx`)

**Шаги:**

1. Страница `/admin/partners`: список пользователей с ролью PARTNER (можно вызвать GET `/api/admin/users?role=PARTNER`). Для каждого: email, имя, кол-во промокодов, кол-во заказов, сумма выкупа, ссылка «Настроить» → `/admin/partners/[userId]`.
2. Страница `/admin/partners/[userId]`: заголовок с именем/email партнёра; таблица привязанных промокодов (код, % дохода, кол-во заказов, сумма выкупа); кнопки «Изменить %», «Отвязать»; форма «Добавить промокод» — выбор существующего промокода + процент; форма «Создать промокод и привязать» — поля как в разделе Промокоды + процент дохода, отправка на POST с createPromo.
3. В `AdminNav.tsx` добавить пункт «Партнёры» с иконкой (например partnership или users), путь `partners`.

**Промт для реализации:**

```
1) Создай страницу nextjs-project/src/app/admin/partners/page.tsx: список партнёров (GET /api/admin/users?role=PARTNER), для каждого — email, имя, кол-во промокодов, заказов, сумма выкупа, ссылка «Настроить» на /admin/partners/[userId].
2) Создай nextjs-project/src/app/admin/partners/[userId]/page.tsx: управление промокодами партнёра — таблица привязок (код, %, заказы, сумма), кнопки изменить % / отвязать; форма «Добавить промокод» (выбор + %); форма «Создать промокод и привязать» (поля промокода + %), вызов POST с createPromo.
3) В AdminNav добавь пункт «Партнёры», путь partners.
```

---

## Task 7: API ЛК партнёра — статистика без суммы выкупа

**Файлы:**
- Создать: `nextjs-project/src/app/api/account/partner-stats/route.ts`

**Шаги:**

1. GET `/api/account/partner-stats`: доступ только для авторизованного пользователя с ролью PARTNER (session.user.role === 'PARTNER'); иначе 403.
2. Вызвать `getPartnerStatsForPartner(session.user.id)` из partner.service.
3. Вернуть JSON: массив по промокодам `{ promoCodeId, code, ordersCount, partnerIncome }`. Поля totalAmount/сумма выкупа не возвращать.

**Промт для реализации:**

```
Создай GET /api/account/partner-stats в nextjs-project/src/app/api/account/partner-stats/route.ts. Проверка: только авторизованный пользователь с ролью PARTNER (иначе 403). Вызови getPartnerStatsForPartner(session.user.id) из partner.service и верни массив { promoCodeId, code, ordersCount, partnerIncome }. Сумму выкупа в ответ не включай.
```

---

## Task 8: ЛК партнёра — страница и навигация

**Файлы:**
- Создать: `nextjs-project/src/app/(site)/account/partner/page.tsx`
- Изменить: компонент, отображающий навигацию/меню ЛК (например `AccountDashboard` или общий layout для `/account`): показывать ссылку «Партнёрская программа» / «Мои промокоды» только если `session.user.role === 'PARTNER'`

**Шаги:**

1. Страница `/account/partner`: RSC или клиент с загрузкой данных. Проверка: если у пользователя роль не PARTNER — redirect на `/account` или 403. Загрузка данных с GET `/api/account/partner-stats`. Отображение: по каждому промокоду — код, кол-во заказов, ваш доход (partnerIncome). Сумму выкупа не показывать. Сводно можно вывести «Всего заказов» и «Общий доход».
2. В навигации ЛК (в `AccountDashboard` или в layout account): если роль PARTNER — добавить ссылку «Партнёрская программа» на `/account/partner`. Роль брать из session (передать в компонент с сервера или получить в клиентском компоненте через useSession).

**Промт для реализации:**

```
1) Создай страницу nextjs-project/src/app/(site)/account/partner/page.tsx: доступ только для role PARTNER (иначе редирект на /account). GET /api/account/partner-stats, отобразить по каждому промокоду: код, кол-во заказов, ваш доход. Сумму выкупа не показывать. Сводка: всего заказов, общий доход.
2) В навигации ЛК (AccountDashboard или layout account) показывай ссылку «Партнёрская программа» на /account/partner только если session.user.role === 'PARTNER'. Роль передавай с сервера или используй useSession на клиенте.
```

---

## Task 9: NextAuth и типы — роль PARTNER

**Файлы:**
- Изменить: `nextjs-project/src/types/next-auth.d.ts` (если роль хранится в session.user)
- Изменить: `nextjs-project/src/lib/auth.ts` (callbacks session: подставлять role из БД, включая PARTNER)
- Изменить: `nextjs-project/src/app/api/admin/users/route.ts` (POST: разрешить role PARTNER в Zod)

**Шаги:**

1. Убедиться, что в session передаётся role (в т.ч. PARTNER). В next-auth.d.ts тип User/role должен включать 'PARTNER'.
2. В middleware или защите админки: доступ только для ADMIN (партнёр не должен заходить в админку по тем же URL, что и админ, если не оговорено иное; по ТЗ «единое окно входа» — партнёр входит как пользователь и видит ЛК с доп. вкладкой). Уточнение: партнёр не является админом, доступ в /admin для него запрещён.
3. В POST `/api/admin/users` в схеме Zod для role добавить 'PARTNER'.

**Промт для реализации:**

```
1) В nextjs-project в типах NextAuth (next-auth.d.ts) добавь роль PARTNER в тип user.role.
2) Убедись, что в auth callbacks session заполняется role из БД (включая PARTNER). Партнёр не должен иметь доступа к /admin (проверка только ADMIN).
3) В POST /api/admin/users в Zod-схеме разреши role 'PARTNER'.
```

---

## Task 10: Финальная проверка

**Шаги:**

1. Запустить `cd nextjs-project && npm run lint && npx prisma generate && npm run build`.
2. Ручная проверка: создать пользователя-партнёра; привязать промокод с %; создать заказ с этим промокодом и статусом paid; проверить статистику в админке и в ЛК партнёра (доход без суммы выкупа).
3. Проверить, что партнёр не попадает в админку; обычный пользователь не видит вкладку «Партнёрская программа».

---

## Промты для реализации (сводка)

Их можно копировать по одному и отдавать агенту/сессии для пошаговой реализации.

1. **Схема Prisma** — см. промт в Task 1.
2. **Сервис partner.service** — см. промт в Task 2.
3. **API админки (users, partners stats, promo-codes)** — см. промт в Task 3.
4. **API создание промокода из раздела партнёра** — см. промт в Task 4.
5. **Админка: пользователи (фильтр, колонки, роль Партнёр)** — см. промт в Task 5.
6. **Админка: страницы Партнёры и партнёр [userId]** — см. промт в Task 6.
7. **API account/partner-stats** — см. промт в Task 7.
8. **ЛК: страница /account/partner и навигация** — см. промт в Task 8.
9. **NextAuth и роль PARTNER** — см. промт в Task 9.
10. **Финальная проверка** — выполнить шаги Task 10 вручную и скриптами.

---

## Зависимости между задачами

- Task 1 → Task 2, 3, 7.
- Task 2 → Task 3, 7.
- Task 3, 4 → Task 5, 6.
- Task 7, 8, 9 → Task 10.

Рекомендуемый порядок: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.
