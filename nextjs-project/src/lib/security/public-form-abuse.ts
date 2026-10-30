import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { isURL } from 'validator'

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

  if (looksGenerated(name)) return false

  // Long single-token consonant-heavy strings are typical generated bot payloads.
  if (!name.includes(' ') && letters.length >= 16) {
    const vowels = letters.match(VOWELS)?.length ?? 0
    if (vowels / letters.length < 0.2) return false
  }

  return true
}

/** Conservative signal: long Latin tokens with repeated random case changes. */
function looksGenerated(value: string): boolean {
  const tokens: string[] = value.match(/[a-zA-Z]{16,}/g) ?? []
  return tokens.some(token => {
    const upper = token.match(/[A-Z]/g)?.length ?? 0
    const lower = token.match(/[a-z]/g)?.length ?? 0
    let transitions = 0
    for (let i = 1; i < token.length; i++) {
      if ((token[i] === token[i].toUpperCase()) !== (token[i - 1] === token[i - 1].toUpperCase())) transitions++
    }
    return upper >= 4 && lower >= 4 && transitions >= 6
  })
}

export function isPlausiblePhone(value: string): boolean {
  const phone = value.trim()
  if (phone.length > 30 || !/^\+?[\d ()-]+$/.test(phone)) return false
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return false
  const parsed = parsePhoneNumberFromString(phone, { defaultCountry: 'RU', extract: false })
  return Boolean(parsed?.isValid())
}

/** One HTTP(S) URL or @handle per line; empty optional fields are allowed. */
export function isValidSocialLinks(value: string): boolean {
  if (value.length > 2000) return false
  const trimmed = value.trim()
  if (!trimmed) return true
  return trimmed.split(/\r?\n/).every(line => {
    const entry = line.trim()
    if (!entry) return true
    if (/^@[a-zA-Z0-9_][a-zA-Z0-9_.-]{1,63}$/.test(entry) && /[a-zA-Z]/.test(entry)) return true
    return isURL(entry, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: true,
      disallow_auth: true,
      allow_ip_domain: false,
      allow_protocol_relative_urls: false,
    })
  })
}

/** Plain text only; retain normal punctuation, Unicode and line breaks. */
export function isPlausibleMessage(value: string): boolean {
  if (value.length > 2000) return false
  if (Array.from(value).some(char => {
    const code = char.codePointAt(0)!
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127
  })) return false
  if (/<\/?[a-z][^>]*>/i.test(value) || looksGenerated(value.replace(/https?:\/\/[^\s]+/gi, ''))) return false
  return !value.trim() || /\p{L}/u.test(value)
}
