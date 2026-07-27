import 'server-only'
import {
  EXPIRES_MINUTES,
  generateSecureToken,
  getExpiresAt,
  hashToken,
} from '@/lib/password-reset'
import { notifyMaxPasswordResetForUser } from '@/lib/max-notify'
import { notifyTelegramPasswordResetForUser } from '@/lib/telegram-notify'
import * as authTokensService from '@/services/auth-tokens.service'

export interface CreatedPasswordResetLink {
  resetLink: string
  tokenRecordId: string
  expiresInMinutes: number
}

export interface PasswordResetMessengerDelivery {
  telegram: boolean
  max: boolean
}

/**
 * Creates a one-time password reset link for a user.
 * Invalidates previous unused tokens for the same user.
 */
export async function createPasswordResetLink(params: {
  userId: string
  baseUrl: string
}): Promise<CreatedPasswordResetLink> {
  await authTokensService.deleteUnusedPasswordResetTokensForUser(params.userId)

  const secret = generateSecureToken()
  const tokenHash = await hashToken(secret)
  const record = await authTokensService.createPasswordResetToken({
    userId: params.userId,
    tokenHash,
    expiresAt: getExpiresAt(),
  })

  const baseUrl = params.baseUrl.replace(/\/$/, '')
  const resetLink = `${baseUrl}/login/reset-password?token=${encodeURIComponent(`${record.id}.${secret}`)}`

  return {
    resetLink,
    tokenRecordId: record.id,
    expiresInMinutes: EXPIRES_MINUTES,
  }
}

/** Sends reset link via linked Telegram and/or MAX bots. */
export async function deliverPasswordResetLinkViaMessengers(params: {
  userId: string
  resetLink: string
  expiresInMinutes: number
}): Promise<PasswordResetMessengerDelivery> {
  const [telegram, max] = await Promise.all([
    notifyTelegramPasswordResetForUser(params),
    notifyMaxPasswordResetForUser(params),
  ])
  return { telegram, max }
}

export function wasPasswordResetDeliveredViaMessenger(
  delivery: PasswordResetMessengerDelivery
): boolean {
  return delivery.telegram || delivery.max
}
