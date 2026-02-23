# --- BASE ---
NEXT_PUBLIC_SITE_URL=https://innerhealth.ru
DATABASE_URL="postgresql://user:password@localhost:5432/innerhealth"

# --- AUTH & ADMIN ---
NEXTAUTH_SECRET="your-32-char-secret"
ADMIN_SECRET_PATH="hidden-admin-url-part"
ADMIN_2FA_SECRET="your-otp-key"

# --- API ---
YOOKASSA_SHOP_ID="your_id"
YOOKASSA_SECRET_KEY="your_key"
CDEK_CLIENT_ID="your_id"
CDEK_CLIENT_SECRET="your_password"

# --- TELEGRAM BOT (уведомления о заказах и заявках) ---
TELEGRAM_BOT_TOKEN="your_bot_token_from_BotFather"
TELEGRAM_SERVICE_SECRET="random_secret_for_bot_to_call_api"
# URL сайта для вызовов API с бота (локально: http://localhost:3000, прод: https://your-domain.com)
TELEGRAM_SITE_URL="https://innerhealth.ru"

# --- DELIVERY & MAIL ---
SMTP_HOST="smtp.provider.com"
SMTP_USER="info@innerhealth.ru"
SMTP_PASS="password"
UPLOAD_STRATEGY="local"