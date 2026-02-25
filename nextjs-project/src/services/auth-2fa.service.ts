import 'server-only';
import { prisma } from '@/lib/prisma';

/** Find TwoFactorPending by id. */
export async function findTwoFactorPendingById(id: string) {
  return prisma.twoFactorPending.findUnique({
    where: { id },
  });
}

/** Find TwoFactorPending by id with user (for verify-2fa and send-code). */
export async function findTwoFactorPendingWithUser(id: string) {
  return prisma.twoFactorPending.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          twoFactorMethod: true,
          totpSecretEncrypted: true,
        },
      },
    },
  });
}

/** Update TwoFactorPending (e.g. emailCodeHash, emailCodeExpiresAt). */
export async function updateTwoFactorPending(
  id: string,
  data: { emailCodeSentAt?: Date | null; emailCodeHash?: string | null; emailCodeExpiresAt?: Date | null }
) {
  return prisma.twoFactorPending.update({
    where: { id },
    data,
  });
}

/** Delete TwoFactorPending after successful verify. */
export async function deleteTwoFactorPending(id: string) {
  return prisma.twoFactorPending.delete({ where: { id } });
}

/** Create TwoFactorGrant. */
export async function createTwoFactorGrant(userId: string, expiresAt: Date) {
  return prisma.twoFactorGrant.create({
    data: { userId, expiresAt },
  });
}

/** Find and consume TwoFactorGrant (validate, mark used, return userId). */
export async function findAndConsumeTwoFactorGrant(grantId: string) {
  const grant = await prisma.twoFactorGrant.findUnique({
    where: { id: grantId },
  });
  if (!grant || grant.usedAt !== null || grant.expiresAt <= new Date()) {
    return null;
  }
  await prisma.twoFactorGrant.update({
    where: { id: grantId },
    data: { usedAt: new Date() },
  });
  return { userId: grant.userId };
}

/** Upsert TwoFactorPending (for login-step1). */
export async function upsertTwoFactorPending(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  emailCodeHash?: string | null;
  emailCodeExpiresAt?: Date | null;
}) {
  return prisma.twoFactorPending.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      emailCodeHash: params.emailCodeHash ?? undefined,
      emailCodeExpiresAt: params.emailCodeExpiresAt ?? undefined,
    },
    update: {
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      emailCodeHash: params.emailCodeHash ?? undefined,
      emailCodeExpiresAt: params.emailCodeExpiresAt ?? undefined,
    },
  });
}
