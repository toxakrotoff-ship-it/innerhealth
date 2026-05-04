import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as promoService from '@/services/promo.service';
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request';

const dateOptional = z.union([z.string(), z.date()]).nullable().optional().transform((v) => (v ? new Date(v) : null));

const postPromoCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0, 'Invalid discount value'),
  isActive: z.boolean().optional().default(true),
  usageLimit: z.number().int().min(0).nullable().optional(),
  validFrom: dateOptional,
  validTo: dateOptional,
});

const putPromoCodeSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  code: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  usageLimit: z.number().int().min(0).nullable().optional(),
  validFrom: dateOptional,
  validTo: dateOptional,
});

const deletePromoCodeSchema = z.object({ id: z.string().min(1, 'ID is required') });

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  try {
    const promoCodes = await promoService.getPromoCodesForAdmin(brandId);
    const formattedCodes = promoCodes.map((code) => ({
      id: code.id,
      code: code.code,
      discountType: code.discountType,
      discountValue: code.discountValue,
      isActive: code.isActive,
      usageLimit: code.usageLimit,
      usedCount: code.usedCount,
      validFrom: code.validFrom,
      validTo: code.validTo,
      createdAt: code.createdAt.toISOString(),
    }));
    
    return NextResponse.json(formattedCodes);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo codes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  let data: z.infer<typeof postPromoCodeSchema>;
  try {
    const raw = await request.json();
    data = postPromoCodeSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const promoCode = await promoService.createPromoCode({
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      isActive: data.isActive,
      usageLimit: data.usageLimit ?? undefined,
      validFrom: data.validFrom,
      validTo: data.validTo,
    }, brandId);
    
    return NextResponse.json(promoCode);
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  let data: z.infer<typeof putPromoCodeSchema>;
  try {
    const raw = await request.json();
    data = putPromoCodeSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const existingCode = await promoService.findPromoCodeById(data.id, brandId);
    if (!existingCode) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }

    const validFrom = data.validFrom ?? existingCode.validFrom;
    const validTo = data.validTo ?? existingCode.validTo;

    const promoCode = await promoService.updatePromoCode(data.id, {
      code: data.code ?? existingCode.code,
      discountType: data.discountType ?? existingCode.discountType,
      discountValue: data.discountValue ?? existingCode.discountValue,
      isActive: data.isActive ?? existingCode.isActive,
      usageLimit: data.usageLimit ?? existingCode.usageLimit,
      validFrom,
      validTo,
    }, brandId);
    
    return NextResponse.json(promoCode);
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json(
      { error: 'Failed to update promo code' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  let parsed: z.infer<typeof deletePromoCodeSchema>;
  try {
    const raw = await request.json();
    parsed = deletePromoCodeSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { id } = parsed;

  try {
    const existingCode = await promoService.findPromoCodeById(id, brandId);
    if (!existingCode) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }

    await promoService.deletePromoCode(id, brandId);
    
    return NextResponse.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json(
      { error: 'Failed to delete promo code' },
      { status: 500 }
    );
  }
}