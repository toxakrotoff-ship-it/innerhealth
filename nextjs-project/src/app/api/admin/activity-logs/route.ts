import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/require-admin';
import { prisma } from '@/lib/prisma';
import { isBrandId } from '@/lib/brand/brand';

const ENTITY_TYPES = ['PRODUCT', 'CATEGORY'] as const;

function isEntityType(value: string): value is (typeof ENTITY_TYPES)[number] {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const entityTypeParam = searchParams.get('entityType');
  const brandParam = searchParams.get('brand');
  const search = searchParams.get('search')?.trim() || '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 30));

  const where: Prisma.ActivityLogWhereInput = {};
  if (entityTypeParam && isEntityType(entityTypeParam)) {
    where.entityType = entityTypeParam;
  }
  if (brandParam && isBrandId(brandParam)) {
    where.brand = brandParam;
  }
  if (search) {
    where.entityName = { contains: search, mode: 'insensitive' };
  }

  try {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      hasNextPage: skip + items.length < total,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
