# Task: Security Hardening

## Requirements (implemented)

1. **Validation:** Zod используется для критичных входных данных:
   - `POST /api/orders` — схема в `src/lib/validations/order.ts`
   - `POST /api/promo/validate` — схема в `src/lib/validations/promo.ts`
2. **Rate limiting:** Защита от перебора и спама:
   - `src/lib/rate-limit.ts` — in-memory лимитер (для продакшена с несколькими инстансами — Upstash Redis).
   - `/api/orders` — 10 запросов/мин на IP.
   - `/api/promo/validate` — 30 запросов/мин на IP.
   - `/api/auth/forgot-password` — 5 запросов/мин на IP.
   - `/api/auth/reset-password` — 10 запросов/мин на IP.
3. **Headers:** В `middleware.ts` добавлены CSP, HSTS (в prod), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection. Применяются в т.ч. к `/api/auth/forgot-password` и `/api/auth/reset-password`.
4. **Secrets:** Ключи только в `.env`; пароли админов хранятся в виде bcrypt-хеша (`src/lib/password.ts`, `scripts/create-admin-user.ts`). В корневом `.gitignore` добавлены `.env`, `.env.local`, `.env*.local`.

## Дополнительно сделано

- **Пароли:** Сравнение через `bcrypt`; при первом входе со старым plain-паролем можно один раз обновить пользователя скриптом `create-admin-user` (пароль перезапишется хешем).
- **Заказы:** Лимиты на количество позиций (50) и количество одного товара (99), валидация email/телефона и длины полей.
- **Загрузка файлов:** Лимит 5 МБ, только разрешённые расширения (jpg, jpeg, png, gif, webp), имя файла генерируется на сервере.
- **SSRF:** В `POST /api/admin/products/upload-image-from-url` запрещены URL на localhost и частные сети (127.x, 10.x, 192.168.x, 172.16–31.x, 169.254.x, IPv6 fd/fe80). В роуте добавлена явная проверка сессии.

## Аудит безопасности (повторный)

### Сильные стороны

- **Аутентификация:** Все маршруты `/api/admin/*` защищены через `withAuth` в middleware и дублирующей проверкой `getServerSession` в хендлерах. Сессия инвалидируется при удалении пользователя из БД (callback `session` в auth).
- **Публичные API:** `/api/orders`, `/api/promo/validate` — валидация Zod, rate limit, без доступа к админ-функциям.
- **Сброс пароля:** Токен хранится в виде bcrypt-хеша, одноразовое использование, срок 60 мин. Rate limit на forgot-password и reset-password.
- **Загрузка (upload):** Только папки `products`/`posts`, лимит размера, whitelist MIME и расширений, имя файла задаётся сервером.
- **XSS:** `dangerouslySetInnerHTML` используется только для статического CSS в новостях и редакторе, не для пользовательского контента.
- **Секреты:** В коде только `process.env.*`, нет хардкода ключей. Рекомендация: не коммитить `.env` (добавлено в `.gitignore`).

### Рекомендации (низкий приоритет)

- **Admin API body:** В `PUT/POST` админки (products, settings, posts, promo-codes) входные тела проверяются частично (allowlist полей или ручные проверки). Для подготовки к оплате можно ввести Zod-схемы для критичных полей (цена, лимиты промокодов, настройки ЮKassa).
- **CSP в prod:** Сейчас `script-src` содержит `'unsafe-inline' 'unsafe-eval'` (нужно для Next.js/React). В продакшене по возможности ужесточить (nonce/hash).
- **Plain-пароль:** В `auth.ts` оставлена поддержка входа по старому plain-паролю для миграции. После перехода всех пользователей на bcrypt — убрать ветку `user.password === credentials.password`.
- **Логи:** Не логировать в прод тело запросов и токены; в forgot-password уже логируется только email (при необходимости убрать или обезличить).

### Чеклист перед запуском оплаты

- [ ] В продакшене задать `NEXTAUTH_SECRET` (длинная случайная строка).
- [ ] Убедиться, что `ADMIN_SECRET_PATH` задан и не равен `admin` (скрытый путь в админку).
- [ ] Рассмотреть Upstash Redis для rate limit при нескольких инстансах.
- [ ] После интеграции платёжного провайдера: добавить его домены в CSP `connect-src`/`frame-src` при необходимости.
- [ ] Не коммитить `.env` и `.env.local`; в репозитории держать только `.env.example` с пустыми значениями.
