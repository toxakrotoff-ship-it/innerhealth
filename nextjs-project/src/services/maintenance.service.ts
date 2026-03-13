import 'server-only';
import { prisma } from '@/lib/prisma';

function getNow(): Date {
  return new Date();
}

export async function cleanupExpiredAuthAndTwoFactorTokens(): Promise<void> {
  const now = getNow();

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
    prisma.setInitialPasswordToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
    prisma.twoFactorPending.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    }),
    prisma.twoFactorGrant.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
    prisma.telegramLinkCode.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    }),
  ]);
}

