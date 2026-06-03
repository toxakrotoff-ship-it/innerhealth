import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request';
import { getPromoOrdersReport } from '@/services/promo-orders-report.service';

const querySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  promoCode: z.string().min(1).optional(),
});

function parseDateRange(dateFrom: string, dateTo: string): { from: Date; to: Date } | null {
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return null;
  }
  return { from, to };
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    dateFrom: url.searchParams.get('dateFrom') ?? undefined,
    dateTo: url.searchParams.get('dateTo') ?? undefined,
    promoCode: url.searchParams.get('promoCode') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const range = parseDateRange(parsed.data.dateFrom, parsed.data.dateTo);
  if (!range) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const brandId = resolveAdminBrandFromRequest(request);

  try {
    const report = await getPromoOrdersReport({
      brandId,
      dateFrom: range.from,
      dateTo: range.to,
      promoCode: parsed.data.promoCode,
    });

    return NextResponse.json({
      summary: report.summary,
      rows: report.rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error building promo orders report:', error);
    return NextResponse.json(
      { error: 'Failed to build promo orders report' },
      { status: 500 }
    );
  }
}
