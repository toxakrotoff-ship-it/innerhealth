/**
 * AES-256-GCM encryption for sensitive site settings (e.g. YooKassa secret, CDEK API key).
 * Optional: set SETTINGS_ENCRYPTION_KEY (32 bytes, base64) in env to enable encryption at rest.
 * If unset, values are stored and returned as plain text (backward compatible).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

const ENCRYPTION_PREFIX = '__enc:v1:'

/** Setting keys that must be stored encrypted when SETTINGS_ENCRYPTION_KEY is set. */
export const SENSITIVE_SETTING_KEYS = [
  'yookassa_secret_key',
  'cdek_api_key',
] as const

export type SensitiveSettingKey = (typeof SENSITIVE_SETTING_KEYS)[number]

function getSettingsEncryptionKey(): Buffer | null {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_LENGTH) return null
  return key
}

/**
 * Encrypts a setting value for storage. Uses AES-256-GCM.
 * If SETTINGS_ENCRYPTION_KEY is not set or invalid, returns the plain value (no encryption).
 * Stored format: __enc:v1:base64(iv || ciphertext || authTag).
 */
export function encryptSettingValue(plain: string): string {
  const key = getSettingsEncryptionKey()
  if (!key || !plain) return plain
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, encrypted, authTag]).toString('base64')
  return `${ENCRYPTION_PREFIX}${payload}`
}

/**
 * Decrypts a setting value from storage.
 * If the value does not start with the encryption prefix, returns it as-is (backward compatibility).
 */
export function decryptSettingValue(value: string): string {
  if (!value || !value.startsWith(ENCRYPTION_PREFIX)) return value
  const key = getSettingsEncryptionKey()
  if (!key) return value
  try {
    const payload = value.slice(ENCRYPTION_PREFIX.length)
    const buf = Buffer.from(payload, 'base64')
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return value
    const iv = buf.subarray(0, IV_LENGTH)
    const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH)
    const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
  } catch {
    return value
  }
}

export function isSensitiveSettingKey(key: string): key is SensitiveSettingKey {
  return (SENSITIVE_SETTING_KEYS as readonly string[]).includes(key)
}
