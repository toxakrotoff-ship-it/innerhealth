import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import { reorderProductsInCategory } from '@/services/product.service';

const reorderSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, 'At least one item is required'),
});

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let parsed: z.infer<typeof reorderSchema>;
  try {
    const raw = await request.json();
    parsed = reorderSchema.parse(raw);
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join('; ')
        : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { categoryId, items } = parsed;

  try {
    await reorderProductsInCategory(
      categoryId,
      items.map((item, index) => ({
        productId: item.productId,
        sortOrder: index,
      }))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error reordering products in category:', error);
    return NextResponse.json(
      { error: 'Failed to reorder products' },
      { status: 500 }
    );
  }
}

