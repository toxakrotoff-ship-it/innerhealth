import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { promoBelongsToBrandScope } from '@/lib/brand/brand-scope';

export interface BotPromoStat {
  code: string;
  usedCount: number;
  usageLimit: number | null;
  isActive: boolean;
}

export async function getPromoStatsForAdmin(
  brandId?: BrandId | null
): Promise<BotPromoStat[]> {
  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      code: true,
      usedCount: true,
      usageLimit: true,
      isActive: true,
    },
  });
  return promos
    .filter((promo) => promoBelongsToBrandScope(promo.code, brandId))
    .map((promo) => ({
      code: promo.code,
      usedCount: promo.usedCount,
      usageLimit: promo.usageLimit,
      isActive: promo.isActive,
    }));
}
