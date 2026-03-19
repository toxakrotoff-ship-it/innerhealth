# Переменные окружения (nextjs-project)

Файл `.env` или `.env.local` создаётся в каталоге **nextjs-project**.

- Сброс пароля и SMTP (Gmail, Яндекс, VK WorkSpace): [nextjs-project/docs/password-reset-env.md](../nextjs-project/docs/password-reset-env.md)
- 2FA (TOTP, коды по почте): [nextjs-project/docs/2fa-env.md](../nextjs-project/docs/2fa-env.md)
- Яндекс.Карты (CSP, ключ): [nextjs-project/docs/yandex-maps-env.md](../nextjs-project/docs/yandex-maps-env.md)

---

# --- BASE ---
NEXT_PUBLIC_SITE_URL=https://innerhealth.ru
# URL сайта для NextAuth (callback, ссылки в письмах). Прод: https://innerhealth.ru
NEXTAUTH_URL=https://innerhealth.ru
# Опционально: то же значение, используется в части API (например, return_url оплаты)
APP_URL=https://innerhealth.ru

DATABASE_URL="postgresql://user:password@localhost:5432/innerhealth"

# --- AUTH & ADMIN ---
NEXTAUTH_SECRET="your-32-char-secret"
ADMIN_SECRET_PATH="hidden-admin-url-part"
ADMIN_2FA_SECRET="your-otp-key"

# --- API ---
# ЮKassa: идентификатор магазина и секретный ключ из ЛК (Интеграция → Ключи API).
# Для теста: переключитесь на тестовый магазин, выпустите секретный ключ (test_...).
YOOKASSA_SHOP_ID="your_shop_id"
YOOKASSA_SECRET_KEY="your_secret_key"
CDEK_CLIENT_ID="your_id"
CDEK_CLIENT_SECRET="your_password"
# Код города отправления СДЭК (для калькулятора и создания заказа на отгрузку)
CDEK_FROM_CITY_CODE="44"
# Данные отправителя для заказа в СДЭК (если не заданы в Настройки → СДЭК)
# CDEK_SENDER_NAME="Название компании"
# CDEK_SENDER_PHONE="+7 (999) 123-45-67"
# CDEK_SENDER_ADDRESS="г. Москва, ул. Примерная, д. 1"

# --- TELEGRAM BOT (уведомления о заказах и заявках) ---
TELEGRAM_BOT_TOKEN="your_bot_token_from_BotFather"
TELEGRAM_SERVICE_SECRET="random_secret_for_bot_to_call_api"
# URL сайта для вызовов API с бота:
#   - Локально (бот и сайт на одной машине): http://localhost:3000
#   - Docker (app и telegram-bot в разных контейнерах): http://app:3000 (уже задано в docker-compose для сервиса telegram-bot, в .env можно не переопределять)
#   - Прод без Docker: https://your-domain.com
TELEGRAM_SITE_URL="https://innerhealth.ru"

# --- YANDEX MAPS (карта ПВЗ СДЭК в корзине, карта на странице контактов) ---
# Ключ из https://developer.tech.yandex.ru/ — обязателен для загрузки API карт.
NEXT_PUBLIC_YANDEX_MAPS_API_KEY="your_yandex_maps_apikey"

# --- DELIVERY & MAIL ---
SMTP_HOST="smtp.provider.com"
SMTP_USER="info@innerhealth.ru"
SMTP_PASS="password"
UPLOAD_STRATEGY="local"