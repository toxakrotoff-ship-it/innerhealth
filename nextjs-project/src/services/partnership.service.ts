import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

/** Get all partnership leads for admin. */
export async function getPartnershipLeads(brandId: BrandId | null = null) {
  return prisma.partnershipLead.findMany({
    where: { brand: resolveDbBrand(brandId) },
    orderBy: { createdAt: 'desc' },
  });
}

/** Create partnership lead. */
export async function createPartnershipLead(
  data: Prisma.PartnershipLeadCreateInput,
  brandId: BrandId | null = null
) {
  return prisma.partnershipLead.create({
    data: {
      ...data,
      brand: resolveDbBrand(brandId),
    },
  });
}
