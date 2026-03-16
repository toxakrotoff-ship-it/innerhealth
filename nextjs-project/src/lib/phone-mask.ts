/**
 * Маска ввода телефона в формате +7 (999) 999-99-99.
 * Из ввода извлекаются только цифры; первая 8 заменяется на 7.
 */

const RU_PHONE_DIGITS_LENGTH = 11
const RU_COUNTRY_CODE = '7'

/** Извлекает цифры из строки; если первая 8 — заменяет на 7. */
export function getPhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length > 0 && digits[0] === '8') {
    return RU_COUNTRY_CODE + digits.slice(1)
  }
  return digits
}

/**
 * Форматирует ввод как +7 (XXX) XXX-XX-XX.
 * Принимает текущее значение и следующий вводимый символ (или пустую строку при удалении).
 * Возвращает отформатированную строку для отображения в поле.
 */
export function formatPhoneDisplay(digits: string): string {
  const d = digits.slice(0, RU_PHONE_DIGITS_LENGTH)
  if (d.length === 0) return ''
  if (d.length <= 1) return d[0] === '7' || d[0] === '8' ? '+7' : `+7 (${d}`
  const rest = d.slice(1)
  const a = rest.slice(0, 3)
  const b = rest.slice(3, 6)
  const c = rest.slice(6, 8)
  const e = rest.slice(8, 10)
  const parts = ['+7']
  if (a.length) parts.push(` (${a}`)
  if (b.length) parts.push(`) ${b}`)
  if (c.length) parts.push(`-${c}`)
  if (e.length) parts.push(`-${e}`)
  return parts.join('')
}

/**
 * По текущему отображаемому значению и вводу пользователя возвращает новое отображаемое значение.
 * rawInput — то, что пользователь ввёл (например, e.target.value после изменения).
 */
export function applyPhoneMask(rawInput: string): string {
  const digits = getPhoneDigits(rawInput)
  return formatPhoneDisplay(digits)
}

/** Валидация российского номера: 11 цифр, первая 7. */
export function validatePhoneRu(value: string): { valid: true } | { valid: false; message: string } {
  const digits = getPhoneDigits(value)
  if (digits.length === 0) {
    return { valid: false, message: 'Укажите номер телефона' }
  }
  if (digits.length < RU_PHONE_DIGITS_LENGTH) {
    return { valid: false, message: 'Введите полный номер: +7 (999) 999-99-99' }
  }
  if (digits.length > RU_PHONE_DIGITS_LENGTH) {
    return { valid: false, message: 'Лишние цифры в номере' }
  }
  if (digits[0] !== RU_COUNTRY_CODE) {
    return { valid: false, message: 'Номер должен начинаться с +7' }
  }
  return { valid: true }
}
