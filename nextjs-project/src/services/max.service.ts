import 'server-only';
import { prisma } from '@/lib/prisma';

export async function getMaxWhitelist() {
  return prisma.maxWhitelist.findMany({
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export async function findMaxWhitelistByMaxUserId(maxUserId: string) {
  return prisma.maxWhitelist.findUnique({ where: { maxUserId } });
}

export async function findMaxWhitelistByUserId(userId: string) {
  return prisma.maxWhitelist.findUnique({ where: { userId } });
}

export async function findMaxWhitelistStatusByUserId(userId: string) {
  return prisma.maxWhitelist.findUnique({
    where: { userId },
    select: { maxUserId: true, linkedAt: true },
  });
}

export async function deleteMaxWhitelistByUserId(userId: string) {
  return prisma.maxWhitelist.deleteMany({ where: { userId } });
}

export async function createMaxLinkCode(params: {
  code: string;
  userId: string;
  expiresAt: Date;
}) {
  return prisma.maxLinkCode.create({
    data: {
      code: params.code,
      userId: params.userId,
      expiresAt: params.expiresAt,
    },
  });
}

export async function findMaxLinkCodeForConfirm(code: string) {
  return prisma.maxLinkCode.findUnique({
    where: { code },
    select: { userId: true, expiresAt: true },
  });
}

export async function confirmMaxLinkAndReturnUserId(
  code: string,
  maxUserId: string
): Promise<string | null> {
  const linkRecord = await findMaxLinkCodeForConfirm(code);
  if (!linkRecord || new Date() > linkRecord.expiresAt) return null;
  await prisma.$transaction(async (tx) => {
    await tx.maxLinkCode.delete({ where: { code } });
    await tx.maxWhitelist.upsert({
      where: { userId: linkRecord.userId },
      create: { userId: linkRecord.userId, maxUserId },
      update: { maxUserId, linkedAt: new Date() },
    });
  });
  return linkRecord.userId;
}

export async function getPartnerMaxUserIdByPromoCodeId(
  promoCodeId: string
): Promise<string | null> {
  const binding = await prisma.partnerPromoCode.findUnique({
    where: { promoCodeId },
    select: { userId: true },
  });
  if (!binding) return null;
  const whitelist = await prisma.maxWhitelist.findUnique({
    where: { userId: binding.userId },
    select: { maxUserId: true },
  });
  return whitelist?.maxUserId ?? null;
}
