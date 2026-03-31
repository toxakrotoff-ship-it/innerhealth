import { NextResponse } from 'next/server';
import { normalizeMaxSubscriptionsPayload } from '@/lib/max/normalize-max-subscriptions-payload';
import { requireAdminSession } from '@/lib/require-admin';
import * as settingsService from '@/services/settings.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

const MAX_PLATFORM_API = 'https://platform-api.max.ru/subscriptions';

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
  const settings = await settingsService.getMaxBotSettings({ brandId });
  if (!settings.token) {
    return NextResponse.json(
      { ok: false, error: 'MAX token не задан. Сохраните токен в настройках MAX.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(MAX_PLATFORM_API, {
      method: 'GET',
      headers: {
        Authorization: settings.token,
      },
    });
    const raw = await response.text();
    const data = raw
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return { raw };
          }
        })()
      : {};

    if (!response.ok) {
      const error =
        typeof data?.error === 'string'
          ? data.error
          : `MAX API returned ${response.status}`;
      return NextResponse.json({ ok: false, error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      data: normalizeMaxSubscriptionsPayload(data),
    });
  } catch (error) {
    console.error('MAX webhook status error:', error);
    return NextResponse.json(
      { ok: false, error: 'Не удалось получить статус webhook в MAX' },
      { status: 500 }
    );
  }
}
