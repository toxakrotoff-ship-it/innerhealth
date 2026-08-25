import type { CheckoutEventType, CheckoutStatus, CheckoutStep } from '@prisma/client'

export const CHECKOUT_STEP_LABELS: Record<CheckoutStep, string> = {
  CART: 'Корзина',
  CONTACT: 'Контакты',
  DELIVERY: 'Доставка',
  CONFIRMATION: 'Подтверждение',
  ORDER_CREATED: 'Заказ создан',
  PAYMENT_INITIALIZATION: 'Инициализация оплаты',
  PAYMENT_CREATED: 'Платёж создан',
  PAYMENT_REDIRECT: 'Редирект на оплату',
  PAYMENT_PROCESSING: 'Обработка оплаты',
  COMPLETED: 'Завершено',
}

export const CHECKOUT_STATUS_LABELS: Record<CheckoutStatus, string> = {
  ACTIVE: 'Активен',
  ABANDONED: 'Брошен',
  PAYMENT_FAILED: 'Ошибка оплаты',
  PAYMENT_CANCELLED: 'Оплата отменена',
  COMPLETED: 'Завершён',
  EXPIRED: 'Истёк',
}

export const CHECKOUT_EVENT_TYPE_LABELS: Record<CheckoutEventType, string> = {
  CHECKOUT_STARTED: 'Checkout начат',
  CONTACT_ENTERED: 'Введены контакты',
  DELIVERY_SELECTED: 'Выбрана доставка',
  PROMO_APPLIED: 'Применён промокод',
  ORDER_CREATED: 'Заказ создан',
  PAYMENT_INITIALIZATION_STARTED: 'Инициализация оплаты',
  PAYMENT_CREATED: 'Платёж создан',
  PAYMENT_REDIRECTED: 'Редирект на оплату',
  PAYMENT_CALLBACK_RECEIVED: 'Получен callback платежа',
  PAYMENT_SUCCEEDED: 'Оплата прошла успешно',
  PAYMENT_FAILED: 'Оплата отклонена',
  PAYMENT_CANCELLED: 'Оплата отменена',
  CHECKOUT_COMPLETED: 'Оформление завершено',
  CHECKOUT_ABANDONED: 'Помечен как брошенный',
  CHECKOUT_REACTIVATED: 'Возобновлён после брошенной корзины',
  VALIDATION_ERROR: 'Ошибка валидации',
  API_ERROR: 'Ошибка API',
  PAYMENT_PROVIDER_ERROR: 'Ошибка платёжного провайдера',
}
