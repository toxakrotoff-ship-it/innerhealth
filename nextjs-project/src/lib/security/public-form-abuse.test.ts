import { describe, expect, it } from 'vitest'
import {
  isBotTrapTriggered,
  isPlausibleHumanName,
  isPlausiblePhone,
  isValidSocialLinks,
  isPlausibleMessage,
} from './public-form-abuse'

describe('public form abuse guards', () => {
  it('accepts normal human names', () => {
    expect(isPlausibleHumanName('Антон Кротов')).toBe(true)
    expect(isPlausibleHumanName("Anna-Marie O'Neil")).toBe(true)
  })

  it('rejects generated consonant-heavy names and non-name characters', () => {
    expect(isPlausibleHumanName('eZDNDMjvFKshsdWWNyDTtcj')).toBe(false)
    expect(isPlausibleHumanName('1234567890')).toBe(false)
  })

  it('validates plausible phone numbers', () => {
    expect(isPlausiblePhone('+7 (999) 123-45-67')).toBe(true)
    expect(isPlausiblePhone('262395301')).toBe(false)
  })

  it('triggers honeypot when hidden field is filled', () => {
    expect(isBotTrapTriggered({ website: 'https://spam.example', formStartedAt: 1_000 }, 5_000)).toBe(true)
  })

  it('triggers timing trap for impossible submit times', () => {
    expect(isBotTrapTriggered({ website: '', formStartedAt: 4_000 }, 5_000)).toBe(true)
    expect(isBotTrapTriggered({ website: '', formStartedAt: 1_000 }, 5_000)).toBe(false)
  })

  it('fails closed when timing signal is missing', () => {
    expect(isBotTrapTriggered({ website: '' }, 5_000)).toBe(true)
  })
})


describe('strict public field validation', () => {
  it.each(['5513734243', '+7 (999) 123-45-67 extra', '+799912345670', '1111111111'])('rejects malformed phone %s', value => {
    expect(isPlausiblePhone(value)).toBe(false)
  })
  it.each(['wGLawnPlfyghyXWiNKXN', 'eZDNDMjvFKshsdWWNyDTtcj'])('rejects generated name %s', value => {
    expect(isPlausibleHumanName(value)).toBe(false)
  })
  it.each(['', '@anna_23', 'https://t.me/anna', 'https://vk.com/anna\n@anna_23', 'https://example.com/profile?q=a,b'])('accepts social profiles %s', value => {
    expect(isValidSocialLinks(value)).toBe(true)
  })
  it.each(['7226992791', 'anna', '@12345678', 'javascript:alert(1)', 'https://localhost/anna', 'https://user:pass@vk.com/anna', 'https://vk.com/anna arbitrary text', '@anna\nspam', 'a'.repeat(2001)])('rejects invalid social profiles %s', value => {
    expect(isValidSocialLinks(value)).toBe(false)
  })
  it.each(['Здравствуйте, хочу сотрудничать!', 'Hello, I would like to work with you.', 'Спасибо!', 'Доставка < 5 дней?', '請問如何合作？', 'Мой профиль https://t.me/+aBcDeFgHiJkLmNoP'])('accepts plain text %s', value => {
    expect(isPlausibleMessage(value)).toBe(true)
  })
  it.each(['PiCaIKQUXcnnpGNFYKQWOlZ', '<script>alert(1)</script>', 'hello\u0000world', 'a'.repeat(2001)])('rejects abusive messages %s', value => {
    expect(isPlausibleMessage(value)).toBe(false)
  })
})
