import 'server-only';
import { prisma } from '@/lib/prisma';

function getNow(): Date {
  return new Date();
}

const ANALYTICS_EVENT_KEEP_LAST_DAYS = (() => {
  const raw = Number(process.env.ANALYTICS_EVENT_KEEP_LAST_DAYS ?? '7');
  return Number.isFinite(raw) && raw >= 0 ? raw : 7;
})();

const CATALOG_ZERO_HIT_KEEP_LAST_DAYS = (() => {
  const raw = Number(process.env.CATALOG_ZERO_HIT_KEEP_LAST_DAYS ?? '90');
  return Number.isFinite(raw) && raw >= 0 ? raw : 90;
})();

function getAnalyticsDeletionCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - ANALYTICS_EVENT_KEEP_LAST_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

function getCatalogZeroHitDeletionCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - CATALOG_ZERO_HIT_KEEP_LAST_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
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
    prisma.analyticsEvent.deleteMany({
      where: {
        occurredAt: { lt: getAnalyticsDeletionCutoff(now) },
      },
    }),
    prisma.catalogSearchZeroHit.deleteMany({
      where: {
        createdAt: { lt: getCatalogZeroHitDeletionCutoff(now) },
      },
    }),
  ]);
}

