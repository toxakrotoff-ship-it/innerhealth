import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as partnerService from '@/services/partner.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const patchSchema = z.object({
  commissionPercent: z.number().min(0).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string; partnerPromoId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  const { userId, partnerPromoId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
      { status: 404 }
    );
  }
  const inScope = await partnerService.isPartnerPromoInBrandScope(partnerPromoId, userId, brandId);
  if (!inScope) {
    return NextResponse.json(
      { error: 'Partner promo binding not found in selected brand' },
      { status: 404 }
    );
  }

  let body: z.infer<typeof patchSchema>;
  try {
    const raw = await request.json();
    body = patchSchema.parse(raw);
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join('; ')
        : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const updated = await partnerService.updatePartnerPromoCommission(
    partnerPromoId,
    body.commissionPercent,
    userId
  );
  if (!updated) {
    return NextResponse.json(
      { error: 'Partner promo binding not found' },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string; partnerPromoId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  const { userId, partnerPromoId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
      { status: 404 }
    );
  }
  const inScope = await partnerService.isPartnerPromoInBrandScope(partnerPromoId, userId, brandId);
  if (!inScope) {
    return NextResponse.json(
      { error: 'Partner promo binding not found in selected brand' },
      { status: 404 }
    );
  }

  const removed = await partnerService.removePromoCodeFromPartner(
    partnerPromoId,
    userId
  );
  if (!removed) {
    return NextResponse.json(
      { error: 'Partner promo binding not found' },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
