import { generateSecret, verify, generateURI } from 'otplib'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const raw = process.env.TOTP_SECRET_ENCRYPTION_KEY
  if (!raw || !raw.trim()) {
    throw new Error('TOTP_SECRET_ENCRYPTION_KEY is not set (32 bytes base64)')
  }
  const key = Buffer.from(raw.trim(), 'base64')
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOTP_SECRET_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64 decoded), got ${key.length}`
    )
  }
  return key
}

/**
 * Generate a new TOTP secret (base32).
 */
export function generateTotpSecret(): string {
  return generateSecret()
}

/**
 * Encrypt TOTP secret for storage. Uses AES-256-GCM.
 * Returns base64(iv || ciphertext || authTag).
 */
export function encryptTotpSecret(plainSecret: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([
    cipher.update(plainSecret, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, encrypted, authTag]).toString('base64')
}

/**
 * Decrypt TOTP secret from storage.
 */
export function decryptTotpSecret(encrypted: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(encrypted, 'base64')
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted TOTP secret format')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH)
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}

/**
 * Verify TOTP code against encrypted secret. Uses ±1 step tolerance.
 */
export async function verifyTotpCode(
  encryptedSecret: string,
  code: string
): Promise<boolean> {
  const secret = decryptTotpSecret(encryptedSecret)
  const result = await verify({
    secret,
    token: code,
    epochTolerance: 1,
  })
  return result.valid
}

/**
 * Generate otpauth:// URI for QR code (Google Authenticator etc.).
 */
export function getTotpUri(
  secret: string,
  label: string,
  issuer: string
): string {
  return generateURI({
    secret,
    label,
    issuer,
  })
}
