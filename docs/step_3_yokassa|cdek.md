# Task: Integration with Yookassa and CDEK API

## Yookassa (реализовано):
- **Создание платежа** — при оформлении заказа (POST `/api/orders`) создаётся заказ в БД и платёж в ЮKassa с чеком 54-ФЗ (`receipt`), возвращается `confirmationUrl`.
- **Редирект** — клиент перенаправляется на страницу оплаты ЮKassa; после оплаты возврат на `/cart?payment=success`.
- **Webhook** — `POST /api/webhooks/yookassa`: при событии `payment.succeeded` заказ переводится в статус `paid`.
- Переменные окружения: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`. Базовый URL для return_url: `APP_URL` или `NEXTAUTH_URL`.
- В ЛК ЮKassa: Интеграция → HTTP-уведомления → URL `https://<ваш-домен>/api/webhooks/yookassa`, события `payment.succeeded`.

## CDEK (по [apidoc.cdek.ru](https://apidoc.cdek.ru)):

Реализовано:

1. **Auth** ([getOAuthToken](https://apidoc.cdek.ru/#tag/auth/operation/getOAuthToken)) — получение Bearer-токена в `src/lib/cdek.ts` (`getCdekToken()`), кэширование.
2. **Location** ([#tag/location](https://apidoc.cdek.ru/#tag/location)) — список городов: `getCdekCities()` в lib, **GET /api/cdek/cities** (query: `q`, `regionCode`, `postalCode`, `size`, `page`, `lang`).
3. **Delivery point** ([search](https://apidoc.cdek.ru/#tag/delivery_point/operation/search)) — поиск ПВЗ: `searchCdekDeliveryPoints()` в lib, **GET /api/cdek/deliverypoints** (query: `cityCode`, `postalCode`, `type=PVZ|POSTAMAT|ALL`, `size`, `page`, `lang`).
4. **Calculator** ([#tag/calculator](https://apidoc.cdek.ru/#tag/calculator)) — расчёт тарифов: `calculateCdekTariffList()`, **POST /api/cdek/calculator** (body: `deliveryKind`, `items`, `toLocation`); блок «Доставка СДЭК» на странице корзины (До ПВЗ / До адреса).

Дальше:
- Виджет или список выбора ПВЗ на корзине (подключить GET /api/cdek/deliverypoints после выбора города).
- Авто-создание заказа в ЛК СДЭК при переходе статуса в PAID.

### Переменные окружения для СДЭК (nextjs-project)
- `CDEK_CLIENT_ID` и `CDEK_CLIENT_SECRET` (или `CDEK_ACCOUNT` и `CDEK_SECURE`) — учётные данные ЛК СДЭК для OAuth.
- `CDEK_FROM_CITY_CODE` — код города отправления (склад/магазин) для расчёта тарифов.