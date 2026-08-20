import { parsePhoneNumberFromString } from 'libphonenumber-js'

const HUMAN_NAME_ALLOWED = /^[\p{L}\p{M}'’\-\s.]+$/u
const LETTERS_ONLY = /\p{L}/gu
const VOWELS = /[aeiouyаеёиоуыэюя]/giu

export interface PublicFormTrapPayload {
  website?: unknown
  formStartedAt?: unknown
}

export function isBotTrapTriggered(payload: PublicFormTrapPayload, now = Date.now()): boolean {
  if (typeof payload.website === 'string' && payload.website.trim().length > 0) return true

  if (typeof payload.formStartedAt !== 'number' || !Number.isFinite(payload.formStartedAt)) return true

  const elapsed = now - payload.formStartedAt
  return elapsed < 1500 || elapsed > 24 * 60 * 60 * 1000
}

export function isPlausibleHumanName(value: string): boolean {
  const name = value.trim()
  if (name.length < 2 || name.length > 120) return false
  if (!HUMAN_NAME_ALLOWED.test(name)) return false

  const letters = name.match(LETTERS_ONLY)?.join('') ?? ''
  if (letters.length < 2) return false

  // Long single-token consonant-heavy strings are typical generated bot payloads.
  if (!name.includes(' ') && letters.length >= 16) {
    const vowels = letters.match(VOWELS)?.length ?? 0
    if (vowels / letters.length < 0.2) return false
  }

  return true
}

export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return false

  const parsed = parsePhoneNumberFromString(value, 'RU')
  return Boolean(parsed?.isPossible())
}
