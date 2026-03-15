import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as partnerService from '@/services/partner.service';

const patchPartnerSchema = z.object({
  partnerIncomeBase: z.enum(['order_total', 'discount_amount']),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { userId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
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
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
