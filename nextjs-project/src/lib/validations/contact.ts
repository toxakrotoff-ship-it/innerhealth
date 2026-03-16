/**
 * Клиентская валидация контактных полей (email и т.д.).
 */

const EMAIL_MAX = 254
/** Упрощённая проверка формата email (локальная часть @ домен.зона). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): { valid: true } | { valid: false; message: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'Укажите email' }
  }
  if (trimmed.length > EMAIL_MAX) {
    return { valid: false, message: 'Слишком длинный email' }
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Введите корректный email, например example@mail.ru' }
  }
  return { valid: true }
}
