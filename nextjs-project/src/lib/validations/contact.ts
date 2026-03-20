/**
 * Клиентская валидация контактных полей (email и т.д.).
 */

import { isEmail } from 'validator'
import { getEmailRiskVerdict } from '@/lib/security/email-risk'

const EMAIL_MAX = 254

export function validateEmail(value: string): { valid: true } | { valid: false; message: string } {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'Укажите email' }
  }
  if (trimmed.length > EMAIL_MAX) {
    return { valid: false, message: 'Слишком длинный email' }
  }
  if (
    !isEmail(trimmed, {
      require_tld: true,
      allow_utf8_local_part: false,
      allow_smtputf8: false,
    })
  ) {
    return { valid: false, message: 'Введите корректный email, например example@mail.ru' }
  }

  if (getEmailRiskVerdict(trimmed) === 'block') {
    return { valid: false, message: 'Временные email адреса недопустимы' }
  }

  return { valid: true }
}
