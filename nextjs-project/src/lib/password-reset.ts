import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

const TOKEN_BYTES = 32
const EXPIRES_MINUTES = 60

export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10)
}

export async function verifyTokenHash(token: string, tokenHash: string): Promise<boolean> {
  return bcrypt.compare(token, tokenHash)
}

export function getExpiresAt(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + EXPIRES_MINUTES)
  return d
}

export { EXPIRES_MINUTES }
