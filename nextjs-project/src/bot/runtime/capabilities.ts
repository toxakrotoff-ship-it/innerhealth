import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

export interface BotUserCapabilities {
  isLinked: boolean;
  isAdmin: boolean;
  isPartner: boolean;
}

function buildCapabilities(role: Role | null | undefined, isLinked: boolean): BotUserCapabilities {
  return {
    isLinked,
    isAdmin: isLinked && (role === Role.ADMIN || role === Role.WRITER),
    isPartner: isLinked && role === Role.PARTNER,
  };
}

export async function getTelegramBotUserCapabilities(
  telegramUserId: string,
  options?: { brandId?: BrandId | null }
): Promise<BotUserCapabilities> {
  const row = await prisma.telegramWhitelist.findUnique({
    where: {
      brand_telegramUserId: {
        brand: resolveDbBrand(options?.brandId),
        telegramUserId,
      },
    },
    select: { user: { select: { role: true } } },
  });
  return buildCapabilities(row?.user.role, Boolean(row));
}

export async function getMaxBotUserCapabilities(
  maxUserId: string,
  options?: { brandId?: BrandId | null }
): Promise<BotUserCapabilities> {
  const row = await prisma.maxWhitelist.findUnique({
    where: {
      brand_maxUserId: {
        brand: resolveDbBrand(options?.brandId),
        maxUserId,
      },
    },
    select: { user: { select: { role: true } } },
  });
  return buildCapabilities(row?.user.role, Boolean(row));
}
