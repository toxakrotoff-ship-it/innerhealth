import { describe, expect, it } from 'vitest'
import {
  isBotTrapTriggered,
  isPlausibleHumanName,
  isPlausiblePhone,
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
    expect(isPlausiblePhone('2623953015')).toBe(false)
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
