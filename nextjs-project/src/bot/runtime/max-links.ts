import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

interface ScopeOptions {
  brandId?: BrandId | null;
}

export async function getMaxWhitelist(options: ScopeOptions = {}) {
  return prisma.maxWhitelist.findMany({
    where: { brand: resolveDbBrand(options.brandId) },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
}

export async function findMaxWhitelistByUserId(userId: string, options: ScopeOptions = {}) {
  return prisma.maxWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId,
      },
    },
  });
}

export async function findMaxWhitelistByMaxUserId(
  maxUserId: string,
  options: ScopeOptions = {}
) {
  return prisma.maxWhitelist.findUnique({
    where: {
      brand_maxUserId: {
        brand: resolveDbBrand(options.brandId),
        maxUserId,
      },
    },
    include: { user: { select: { id: true, role: true } } },
  });
}

export async function confirmMaxLinkAndReturnUserId(
  code: string,
  maxUserId: string
): Promise<{ userId: string; brandId: BrandId } | null> {
  const linkRecord = await prisma.maxLinkCode.findFirst({
    where: { code },
    select: { brand: true, userId: true, expiresAt: true },
  });
  if (!linkRecord || new Date() > linkRecord.expiresAt) return null;
  const brandId = resolveDbBrand(linkRecord.brand as BrandId | null | undefined);
  await prisma.$transaction(async (tx) => {
    await tx.maxLinkCode.delete({
      where: { brand_code: { brand: linkRecord.brand, code } },
    });
    await tx.maxWhitelist.upsert({
      where: {
        brand_userId: {
          brand: linkRecord.brand,
          userId: linkRecord.userId,
        },
      },
      create: { brand: linkRecord.brand, userId: linkRecord.userId, maxUserId },
      update: { maxUserId, linkedAt: new Date() },
    });
  });
  return { userId: linkRecord.userId, brandId };
}
