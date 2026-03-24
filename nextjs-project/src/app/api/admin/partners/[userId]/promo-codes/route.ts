import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as partnerService from '@/services/partner.service';
import * as promoService from '@/services/promo.service';
import { resolveBrandFromRequest } from '@/lib/brand/brand-request';

const dateOptional = z
  .union([z.string(), z.date()])
  .nullable()
  .optional()
  .transform((v) => (v ? new Date(v) : null));

/** Body: either { promoCodeId, commissionPercent } or { createPromo: true, code, discountType, discountValue, commissionPercent, ... }. */
const postPromoCodeSchema = z.union([
  z.object({
    createPromo: z.literal(true),
    code: z.string().min(1, 'Code is required').transform((s) => s.trim()),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0, 'Invalid discount value'),
    usageLimit: z.number().int().min(0).nullable().optional(),
    validFrom: dateOptional,
    validTo: dateOptional,
    commissionPercent: z.number().min(0).max(100),
  }),
  z.object({
    promoCodeId: z.string().min(1),
    commissionPercent: z.number().min(0).max(100),
  }),
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  const { userId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
      { status: 404 }
    );
  }

  try {
    const list = await partnerService.getPartnerPromoCodes(userId, brandId);
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching partner promo codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner promo codes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  const { userId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
      { status: 404 }
    );
  }

  let body: z.infer<typeof postPromoCodeSchema>;
  try {
    const raw = await request.json();
    body = postPromoCodeSchema.parse(raw);
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join('; ')
        : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let promoCodeId: string;

  if ('createPromo' in body && body.createPromo) {
    const createBody = body as Extract<z.infer<typeof postPromoCodeSchema>, { createPromo: true }>;
    const existingByCode = await promoService.findPromoByCode(createBody.code, brandId);
    if (existingByCode) {
      return NextResponse.json(
        { error: 'Promo code with this code already exists' },
        { status: 409 }
      );
    }
    const promo = await promoService.createPromoCode({
      code: createBody.code,
      discountType: createBody.discountType,
      discountValue: createBody.discountValue,
      usageLimit: createBody.usageLimit ?? undefined,
      validFrom: createBody.validFrom,
      validTo: createBody.validTo,
    }, brandId);
    promoCodeId = promo.id;
  } else {
    const assignBody = body as Extract<z.infer<typeof postPromoCodeSchema>, { promoCodeId: string }>;
    promoCodeId = assignBody.promoCodeId;
    const promoInScope = await promoService.findPromoById(promoCodeId, brandId);
    if (!promoInScope) {
      return NextResponse.json(
        { error: 'Promo code not found in selected brand scope' },
        { status: 404 }
      );
    }
  }

  const result = await partnerService.assignPromoCodeToPartner(
    userId,
    promoCodeId,
    body.commissionPercent
  );

  if (result.ok === false) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: result.id });
}
