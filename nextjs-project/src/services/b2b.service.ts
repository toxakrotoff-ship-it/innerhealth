import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

/** Get all B2B leads for admin. */
export async function getB2bLeads(brandId: BrandId | null = null) {
  return prisma.b2bLead.findMany({
    where: { brand: resolveDbBrand(brandId) },
    orderBy: { createdAt: 'desc' },
  });
}

/** Create B2B lead. */
export async function createB2bLead(
  data: Prisma.B2bLeadCreateInput,
  brandId: BrandId | null = null
) {
  return prisma.b2bLead.create({
    data: {
      ...data,
      brand: resolveDbBrand(brandId),
    },
  });
}
