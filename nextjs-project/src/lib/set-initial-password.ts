import crypto from 'crypto'
import bcrypt from 'bcrypt'
import {
  generateSecureToken,
  hashToken,
  verifyTokenHash,
} from '@/lib/password-reset'

const LINK_EXPIRES_HOURS = 48
const CODE_EXPIRES_MINUTES = 15

export function getLinkExpiresAt(): Date {
  const d = new Date()
  d.setHours(d.getHours() + LINK_EXPIRES_HOURS)
  return d
}

export function getCodeExpiresAt(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + CODE_EXPIRES_MINUTES)
  return d
}

/** Generate 6-digit numeric code (string). */
export function generateSixDigitCode(): string {
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}

export async function hashCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10)
}

export async function verifyCodeHash(code: string, codeHash: string): Promise<boolean> {
  return bcrypt.compare(code, codeHash)
}

export { generateSecureToken, hashToken, verifyTokenHash }

export { CODE_EXPIRES_MINUTES }
