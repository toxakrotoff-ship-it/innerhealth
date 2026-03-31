import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { promoBelongsToBrandScope } from '@/lib/brand/brand-scope';
import { resolveDbBrand } from '@/lib/brand/brand-db';

const PAID_STATUSES = ['paid', 'completed'] as const;

export interface BotPartnerStat {
  promoCodeId: string;
  code: string;
  ordersCount: number;
  applicationsCount: number;
  partnerIncome: number;
}

async function getPartnerIncomeBaseForUser(userId: string): Promise<'order_total' | 'discount_amount'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, partnerIncomeBase: true },
  });
  if (user?.role !== Role.PARTNER) return 'order_total';
  return user.partnerIncomeBase?.trim().toLowerCase() === 'discount_amount'
    ? 'discount_amount'
    : 'order_total';
}

export async function getPartnerStatsForUser(
  userId: string,
  brandId?: BrandId | null
): Promise<BotPartnerStat[]> {
  const incomeBase = await getPartnerIncomeBaseForUser(userId);
  const bindings = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: { promoCode: { select: { id: true, code: true } } },
  });

  const results: BotPartnerStat[] = [];

  for (const binding of bindings) {
    if (!promoBelongsToBrandScope(binding.promoCode.code, brandId)) continue;
    const [paidAgg, applicationsCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          promoCodeId: binding.promoCodeId,
          status: { in: [...PAID_STATUSES] },
        },
        _count: { id: true },
        _sum: {
          total: true,
          promoDiscountAmount: true,
        },
      }),
      prisma.order.count({
        where: { promoCodeId: binding.promoCodeId },
      }),
    ]);

    const baseAmount =
      incomeBase === 'discount_amount'
        ? (paidAgg._sum.promoDiscountAmount ?? 0)
        : (paidAgg._sum.total ?? 0);

    results.push({
      promoCodeId: binding.promoCode.id,
      code: binding.promoCode.code,
      ordersCount: paidAgg._count.id,
      applicationsCount,
      partnerIncome: baseAmount * (binding.commissionPercent / 100),
    });
  }

  return results;
}

export async function getPartnerStatsByTelegramUserId(
  telegramUserId: string,
  brandId?: BrandId | null
): Promise<BotPartnerStat[] | null> {
  const whitelist = await prisma.telegramWhitelist.findUnique({
    where: {
      brand_telegramUserId: {
        brand: resolveDbBrand(brandId),
        telegramUserId,
      },
    },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!whitelist || whitelist.user.role !== Role.PARTNER) return null;
  return getPartnerStatsForUser(whitelist.user.id, brandId);
}

export async function getPartnerStatsByMaxUserId(
  maxUserId: string,
  brandId?: BrandId | null
): Promise<BotPartnerStat[] | null> {
  const whitelist = await prisma.maxWhitelist.findUnique({
    where: {
      brand_maxUserId: {
        brand: resolveDbBrand(brandId),
        maxUserId,
      },
    },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!whitelist || whitelist.user.role !== Role.PARTNER) return null;
  return getPartnerStatsForUser(whitelist.user.id, brandId);
}
