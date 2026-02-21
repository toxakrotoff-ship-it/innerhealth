import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SETTING_KEYS = [
  'cdek_api_key',
  'yookassa_shop_id',
  'yookassa_secret_key',
  'yookassa_term_id',
  'site_name',
  'site_contact_email',
  'default_currency',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const map: Record<string, string> = {};
    for (const k of SETTING_KEYS) {
      map[k] = '';
    }
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return NextResponse.json(map);
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, string>;
    for (const key of SETTING_KEYS) {
      const value = body[key];
      if (value === undefined) continue;
      const str = typeof value === 'string' ? value : String(value ?? '');
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: str },
        update: { value: str },
      });
    }
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
    });
    const map: Record<string, string> = {};
    for (const k of SETTING_KEYS) {
      map[k] = '';
    }
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return NextResponse.json(map);
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
