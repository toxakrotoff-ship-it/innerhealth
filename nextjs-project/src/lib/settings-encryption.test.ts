import { describe, expect, it } from 'vitest'
import {
  isEncryptedSettingValue,
  isSensitiveSettingStorageKey,
} from '@/lib/settings-encryption'

describe('isSensitiveSettingStorageKey', () => {
  it('returns true for plain sensitive keys', () => {
    expect(isSensitiveSettingStorageKey('cdek_api_key')).toBe(true)
    expect(isSensitiveSettingStorageKey('cdek_client_secret')).toBe(true)
    expect(isSensitiveSettingStorageKey('yookassa_secret_key')).toBe(true)
  })

  it('returns true for brand-scoped sensitive keys', () => {
    expect(isSensitiveSettingStorageKey('inner:cdek_api_key')).toBe(true)
    expect(isSensitiveSettingStorageKey('sprint-power:cdek_client_secret')).toBe(true)
  })

  it('returns false for non-sensitive keys', () => {
    expect(isSensitiveSettingStorageKey('site_name')).toBe(false)
    expect(isSensitiveSettingStorageKey('inner:site_name')).toBe(false)
  })
})

describe('isEncryptedSettingValue', () => {
  it('returns true only for encrypted payload prefix', () => {
    expect(isEncryptedSettingValue('__enc:v1:abc')).toBe(true)
    expect(isEncryptedSettingValue('__enc:v2:abc')).toBe(false)
    expect(isEncryptedSettingValue('plain-value')).toBe(false)
    expect(isEncryptedSettingValue('')).toBe(false)
  })
})
