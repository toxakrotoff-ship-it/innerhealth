import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

interface ScopeOptions {
  brandId?: BrandId | null;
}

export async function getTelegramWhitelist(options: ScopeOptions = {}) {
  return prisma.telegramWhitelist.findMany({
    where: { brand: resolveDbBrand(options.brandId) },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
}

export async function findTelegramWhitelistByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId,
      },
    },
  });
}

export async function findTelegramWhitelistByTelegramUserId(
  telegramUserId: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramWhitelist.findUnique({
    where: {
      brand_telegramUserId: {
        brand: resolveDbBrand(options.brandId),
        telegramUserId,
      },
    },
    include: { user: { select: { id: true, role: true } } },
  });
}

export async function confirmTelegramLinkAndReturnUserId(
  code: string,
  telegramUserId: string
): Promise<{ userId: string; brandId: BrandId } | null> {
  const linkRecord = await prisma.telegramLinkCode.findFirst({
    where: { code },
    select: { brand: true, userId: true, expiresAt: true },
  });
  if (!linkRecord || new Date() > linkRecord.expiresAt) return null;
  const brandId = resolveDbBrand(linkRecord.brand as BrandId | null | undefined);
  await prisma.$transaction(async (tx) => {
    await tx.telegramLinkCode.delete({
      where: { brand_code: { brand: linkRecord.brand, code } },
    });
    await tx.telegramWhitelist.upsert({
      where: {
        brand_userId: {
          brand: linkRecord.brand,
          userId: linkRecord.userId,
        },
      },
      create: {
        brand: linkRecord.brand,
        userId: linkRecord.userId,
        telegramUserId,
      },
      update: { telegramUserId, linkedAt: new Date() },
    });
  });
  return { userId: linkRecord.userId, brandId };
}
