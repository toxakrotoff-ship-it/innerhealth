import { createHmac, randomBytes } from 'node:crypto'
import bcrypt from 'bcrypt'
import * as auth2faService from '@/services/auth-2fa.service'

export const TWO_FACTOR_PENDING_COOKIE = 'two_factor_pending'
const PENDING_TTL_SEC = 10 * 60 // 10 min
const GRANT_TTL_SEC = 2 * 60 // 2 min

function buildPendingCookieAttributes(maxAgeSec: number): string {
  const parts = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ]
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  return parts.join('; ')
}

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || !secret.trim()) {
    throw new Error('NEXTAUTH_SECRET is required for 2FA cookie signing')
  }
  return secret.trim()
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = signPayload(payload)
  return expected.length > 0 && signature.length > 0 && expected === signature
}

/**
 * Generate a random token and its bcrypt hash for storing in TwoFactorPending.
 */
export async function createPendingToken(): Promise<{ token: string; hash: string }> {
  const token = randomBytes(32).toString('hex')
  const hash = await bcrypt.hash(token, 10)
  return { token, hash }
}

/**
 * Verify a plain token against stored bcrypt hash.
 */
export async function verifyPendingTokenHash(
  plainToken: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainToken, hash)
}

/**
 * Build the value for the Set-Cookie header (pending id, signed).
 * Caller should set: headers.append('Set-Cookie', value).
 */
export function buildPendingCookieValue(pendingId: string): string {
  const payload = Buffer.from(pendingId, 'utf8').toString('base64url')
  const signature = signPayload(payload)
  const value = `${payload}.${signature}`
  return `${TWO_FACTOR_PENDING_COOKIE}=${value}; ${buildPendingCookieAttributes(PENDING_TTL_SEC)}`
}

/**
 * Parse cookie header and return pending id if signature is valid.
 */
export function getPendingIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(
    new RegExp(`${TWO_FACTOR_PENDING_COOKIE}=([^;]+)`)
  )
  const value = match?.[1]?.trim()
  if (!value) return null
  const [payloadB64, signature] = value.split('.')
  if (!payloadB64 || !signature || !verifySignature(payloadB64, signature)) {
    return null
  }
  try {
    return Buffer.from(payloadB64, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/**
 * Build Set-Cookie header to clear the pending cookie.
 */
export function clearPendingCookieHeader(): string {
  return `${TWO_FACTOR_PENDING_COOKIE}=; ${buildPendingCookieAttributes(0)}`
}

/**
 * Create a one-time grant for the user after successful 2FA. Returns grant id to pass to signIn.
 */
export async function createGrant(userId: string): Promise<{ grantId: string }> {
  const expiresAt = new Date()
  expiresAt.setSeconds(expiresAt.getSeconds() + GRANT_TTL_SEC)
  const grant = await auth2faService.createTwoFactorGrant(userId, expiresAt)
  return { grantId: grant.id }
}

/**
 * Consume a one-time grant: validate and mark used, return userId or null.
 */
export async function consumeGrant(
  grantId: string
): Promise<{ userId: string } | null> {
  return auth2faService.findAndConsumeTwoFactorGrant(grantId)
}

export const TWO_FACTOR_PENDING_TTL_SEC = PENDING_TTL_SEC
export const TWO_FACTOR_GRANT_TTL_SEC = GRANT_TTL_SEC
