import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as settingsService from '@/services/settings.service';

export type { SettingKey } from '@/services/settings.service';

const putSettingsSchema = z.record(z.string(), z.string());

const ADMIN_SETTINGS_KEYS = [
  ...settingsService.SETTING_KEYS,
  ...settingsService.SCHEMA_ORG_KEYS,
] as const;

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const map = await settingsService.getSettingsMap(ADMIN_SETTINGS_KEYS);
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
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let body: z.infer<typeof putSettingsSchema>;
  try {
    const raw = await request.json();
    body = putSettingsSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const map = await settingsService.upsertSettings(body, ADMIN_SETTINGS_KEYS);
    return NextResponse.json(map);
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
