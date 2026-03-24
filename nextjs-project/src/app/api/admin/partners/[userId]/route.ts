import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as partnerService from '@/services/partner.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const patchPartnerSchema = z.object({
  partnerIncomeBase: z.enum(['order_total', 'discount_amount']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  const { userId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
      { status: 404 }
    );
  }
  const hasBrandPromo = await partnerService.hasPartnerPromoInBrandScope(userId, brandId);
  if (!hasBrandPromo) {
    return NextResponse.json(
      { error: 'Partner is not available in the selected brand' },
      { status: 404 }
    );
  }

  let body: z.infer<typeof patchPartnerSchema>;
  try {
    const raw = await request.json();
    body = patchPartnerSchema.parse(raw);
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join('; ')
        : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = await partnerService.updatePartnerIncomeBase(
    userId,
    body.partnerIncomeBase
  );
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  const failed = result as { ok: false; error: string };
  return NextResponse.json({ error: failed.error }, { status: 400 });
}
