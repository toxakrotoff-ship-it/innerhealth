# Task: Integration with Yookassa and CDEK API

**Статус:** реализовано. Общий статус проекта — [STATUS.md](./STATUS.md).

Переменные окружения для ЮKassa и СДЭК перечислены в [env's.md](./env's.md). Базовый URL для return_url: `APP_URL` или `NEXTAUTH_URL`.

## Yookassa (реализовано):
- **Создание платежа** — при оформлении заказа (POST `/api/orders`) создаётся заказ в БД и платёж в ЮKassa с чеком 54-ФЗ (`receipt`), возвращается `confirmationUrl`.
- **Редирект** — клиент перенаправляется на страницу оплаты ЮKassa; после оплаты возврат на `/cart?payment=success`.
- **Учётные данные и чек**: приоритет у настроек из админки (Настройки сайта → Оплата ЮKassa): Shop ID, секретный ключ, НДС для товаров и НДС для доставки (чеки 54-ФЗ). Если в админке не заданы — используются переменные окружения `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`; НДС по умолчанию — 1 (без НДС). Базовый URL для return_url: `APP_URL` или `NEXTAUTH_URL`.
- **URL уведомлений** (обновление статуса заказа на сайте): в ЛК ЮKassa → Интеграция → HTTP-уведомления укажите URL `https://<ваш-домен>/api/webhooks/yookassa` и включите события **payment.succeeded** и **payment.canceled**. При успешной оплате заказ переводится в статус `paid`, при отмене платежа — в `canceled`.

### Как настроить тестовый магазин ЮKassa
1. Откройте [личный кабинет ЮKassa](https://yookassa.ru/my), список сервисов → переключитесь на **тестовый магазин**.
2. **Интеграция → Ключи API** — выпустите секретный ключ (для теста будет вида `test_...`). Идентификатор магазина (Shop ID) указан там же.
3. **Интеграция → HTTP-уведомления** → «Изменить настройки»:
   - URL: `https://<ваш-домен>/api/webhooks/yookassa` (для локальной разработки можно использовать [ngrok](https://ngrok.com) или аналог и указать этот URL).
   - События: включите **payment.succeeded** и **payment.canceled** (чтобы на сайте обновлялся статус заказа при отмене оплаты).
4. В `.env` / `.env.local` пропишите:
   - `YOOKASSA_SHOP_ID` — идентификатор тестового магазина из ЛК;
   - `YOOKASSA_SECRET_KEY` — секретный ключ из тестового магазина.
5. **Тестовые платежи**: деньги не списываются. Для оплаты картой используйте [тестовые карты ЮKassa](https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing#test-bank-card) (например **5555 5555 5555 4444** — Mastercard без 3-D Secure, **4111 1111 1111 1111** — Visa). Любой срок действия в будущем, любой CVC. Оплата из реального кошелька ЮMoney в тестовом магазине не пройдёт — выйдите из аккаунта ЮMoney перед тестом кошельком.

## CDEK (по [apidoc.cdek.ru](https://apidoc.cdek.ru)):

Реализовано:

1. **Auth** ([getOAuthToken](https://apidoc.cdek.ru/#tag/auth/operation/getOAuthToken)) — получение Bearer-токена в `src/lib/cdek.ts` (`getCdekToken()`), кэширование.
2. **Location** ([#tag/location](https://apidoc.cdek.ru/#tag/location)) — список городов: `getCdekCities()` в lib, **GET /api/cdek/cities** (query: `q`, `regionCode`, `postalCode`, `size`, `page`, `lang`).
3. **Delivery point** ([search](https://apidoc.cdek.ru/#tag/delivery_point/operation/search)) — поиск ПВЗ: `searchCdekDeliveryPoints()` в lib, **GET /api/cdek/deliverypoints** (query: `cityCode`, `postalCode`, `type=PVZ|POSTAMAT|ALL`, `size`, `page`, `lang`).
4. **Calculator** ([#tag/calculator](https://apidoc.cdek.ru/#tag/calculator)) — расчёт тарифов: `calculateCdekTariffList()`, **POST /api/cdek/calculator** (body: `deliveryKind`, `items`, `toLocation`); блок «Доставка СДЭК» на странице корзины (До ПВЗ / До адреса).

### Габариты товара для расчёта доставки
Для калькулятора СДЭК **нужны габариты посылки**: вес (граммы) и размеры (мм) — длина, ширина, высота. В API это массив `packages` с полями `weight`, `length`, `width`, `height`. В проекте:
- У товара в БД могут быть поля `weight`, `length`, `width`, `height` (при импорте/редактировании).
- Если у товара габариты не заданы — подставляются **дефолты**: вес 500 г, размеры 200×200×200 мм (`src/lib/cdek.ts`: `getDefaultCdekPackage`, `productToCdekPackage`).
- Итог: для отправки расчёта в СДЭК габариты **обязательны на уровне API**, но в карточке товара их можно не указывать — тогда используются указанные дефолты. Для более точной стоимости и корректных ограничений СДЭК лучше заполнять реальные вес и размеры у товаров.

5. **Создание заказа на отгрузку** ([#tag/orders](https://apidoc.cdek.ru/#tag/orders)) — при переходе заказа в статус «Оплачен» для доставок СДЭК (до ПВЗ или до двери) автоматически создаётся заказ на отгрузку в СДЭК. При ошибке выполняется несколько повторов с задержкой; если не удалось — в админке (Заказы → подробнее по заказу) отображается текст ошибки и доступна кнопка **«Создать отгрузку в СДЭК»** для ручного повтора.

**Данные отправителя** для создания заказа в СДЭК задаются в **Настройки сайта → Доставка (СДЭК)**: имя отправителя, телефон, адрес, код города отправления. При отсутствии в настройках используются переменные окружения `CDEK_SENDER_NAME`, `CDEK_SENDER_PHONE`, `CDEK_SENDER_ADDRESS`, `CDEK_FROM_CITY_CODE`.

### Переменные окружения для СДЭК (nextjs-project)
- `CDEK_CLIENT_ID` и `CDEK_CLIENT_SECRET` (или `CDEK_ACCOUNT` и `CDEK_SECURE`) — учётные данные ЛК СДЭК для OAuth.
- `CDEK_FROM_CITY_CODE` — код города отправления (склад/магазин) для расчёта тарифов и для создания заказа на отгрузку.
- Опционально (если не заданы в админке): `CDEK_SENDER_NAME`, `CDEK_SENDER_PHONE`, `CDEK_SENDER_ADDRESS` — данные отправителя для заказа в СДЭК.