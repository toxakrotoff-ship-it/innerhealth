import 'server-only'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const TOKEN_BYTES = 32
const TOKEN_EXPIRES_HOURS = 24

export const EMAIL_VERIFICATION_ERROR_CODES = {
  userNotFound: 'USER_NOT_FOUND',
  alreadyVerified: 'ALREADY_VERIFIED',
  invalidToken: 'INVALID_TOKEN',
  expiredToken: 'EXPIRED_TOKEN',
  usedToken: 'USED_TOKEN',
} as const

export interface EmailVerificationServiceError extends Error {
  code: (typeof EMAIL_VERIFICATION_ERROR_CODES)[keyof typeof EMAIL_VERIFICATION_ERROR_CODES]
}

export interface IssueEmailVerificationTokenResult {
  token: string
  userId: string
  email: string
  expiresAt: Date
}

function createEmailVerificationServiceError(
  code: EmailVerificationServiceError['code'],
  message: string
): EmailVerificationServiceError {
  return Object.assign(new Error(message), { code })
}

function generateEmailVerificationToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

function hashEmailVerificationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getTokenExpiresAt(): Date {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRES_HOURS)
  return expiresAt
}

export async function issueEmailVerificationToken(userId: string): Promise<IssueEmailVerificationTokenResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true },
  })

  if (!user) {
    throw createEmailVerificationServiceError(
      EMAIL_VERIFICATION_ERROR_CODES.userNotFound,
      'User not found'
    )
  }

  if (user.emailVerifiedAt) {
    throw createEmailVerificationServiceError(
      EMAIL_VERIFICATION_ERROR_CODES.alreadyVerified,
      'Email is already verified'
    )
  }

  const token = generateEmailVerificationToken()
  const tokenHash = hashEmailVerificationToken(token)
  const expiresAt = getTokenExpiresAt()

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })
    await tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    })
  })

  return { token, userId: user.id, email: user.email, expiresAt }
}

export async function confirmEmailVerificationToken(token: string) {
  const tokenHash = hashEmailVerificationToken(token)
  const verificationRecord = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { id: true, emailVerifiedAt: true } },
    },
  })

  if (!verificationRecord) {
    throw createEmailVerificationServiceError(
      EMAIL_VERIFICATION_ERROR_CODES.invalidToken,
      'Verification token is invalid'
    )
  }

  if (verificationRecord.usedAt) {
    throw createEmailVerificationServiceError(
      EMAIL_VERIFICATION_ERROR_CODES.usedToken,
      'Verification token is already used'
    )
  }

  if (verificationRecord.expiresAt < new Date()) {
    throw createEmailVerificationServiceError(
      EMAIL_VERIFICATION_ERROR_CODES.expiredToken,
      'Verification token has expired'
    )
  }

  if (verificationRecord.user.emailVerifiedAt) {
    throw createEmailVerificationServiceError(
      EMAIL_VERIFICATION_ERROR_CODES.alreadyVerified,
      'Email is already verified'
    )
  }

  const now = new Date()
  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationRecord.userId },
      data: { emailVerifiedAt: now },
    }),
    prisma.emailVerificationToken.update({
      where: { id: verificationRecord.id },
      data: { usedAt: now },
    }),
  ])

  return { userId: verificationRecord.userId, emailVerifiedAt: now }
}
