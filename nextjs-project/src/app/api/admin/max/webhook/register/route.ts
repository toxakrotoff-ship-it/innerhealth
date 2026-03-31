import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as settingsService from '@/services/settings.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

const MAX_PLATFORM_API = 'https://platform-api.max.ru/subscriptions';

function buildWebhookUrl(rawUrl: string, brandId: string): string {
  if (!rawUrl.trim()) return rawUrl;
  const parsed = new URL(rawUrl);
  if (!parsed.searchParams.get('brand')) {
    parsed.searchParams.set('brand', brandId);
  }
  return parsed.toString();
}

export async function POST(request: Request) {
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
  if (!settings.webhookUrl) {
    return NextResponse.json(
      { ok: false, error: 'Webhook URL не задан. Укажите max_bot_webhook_url.' },
      { status: 400 }
    );
  }

  try {
    const webhookUrl = buildWebhookUrl(settings.webhookUrl, brandId);
    const body: Record<string, unknown> = {
      url: webhookUrl,
      update_types: ['bot_started', 'message_created', 'message_callback'],
    };
    if (settings.webhookSecret) {
      body.secret = settings.webhookSecret;
    }

    const response = await fetch(MAX_PLATFORM_API, {
      method: 'POST',
      headers: {
        Authorization: settings.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
      message: 'Webhook зарегистрирован в MAX',
      data,
    });
  } catch (error) {
    console.error('MAX webhook register error:', error);
    return NextResponse.json(
      { ok: false, error: 'Не удалось зарегистрировать webhook в MAX' },
      { status: 500 }
    );
  }
}
