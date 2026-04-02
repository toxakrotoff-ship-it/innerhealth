import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  calculateCdekTariffList,
  getCdekToken,
  resolveCdekSenderSettings,
  type CdekLocation,
} from '@/lib/cdek'
import { normalizeWidgetPayload } from '@/lib/cdek-widget-payload'
import * as settingsService from '@/services/settings.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const WIDGET_TARIFF_CODES = [136, 137] as const

const requestSchema = z
  .object({
    action: z.enum(['offices', 'calculate']),
  })
  .passthrough()

function buildCdekBaseUrl(useTest: boolean): string {
  return useTest ? 'https://api.edu.cdek.ru/v2' : 'https://api.cdek.ru/v2'
}

function json(data: unknown, init?: ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Version': '3.11.1',
      ...(init?.headers ?? {}),
    },
  })
}

function normalizeCalculateResponse(text: string): string {
  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) {
      return JSON.stringify({ tariff_codes: parsed })
    }
    return text
  } catch {
    return text
  }
}

const calculatorPayloadSchema = z.object({
  to_location: z.record(z.string(), z.unknown()),
  packages: z.array(z.object({
    weight: z.number().positive(),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  })).min(1),
  type: z.union([z.literal(1), z.literal(2)]).optional(),
  currency: z.number().int().positive().optional(),
  lang: z.enum(['rus', 'eng']).optional(),
  services: z.array(z.record(z.string(), z.unknown())).optional(),
  date: z.union([z.string(), z.number()]).optional(),
})

async function proxyToCdek(params: {
  baseUrl: string
  token: string
  action: 'offices' | 'calculate'
  data: Record<string, unknown>
}) {
  const { baseUrl, token, action, data } = params

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-App-Name': 'widget_pvz',
    'X-App-Version': '3.11.1',
    'User-Agent': 'widget/3.11.1',
  }

  if (action === 'offices') {
    // Widget may call `offices` before user chose a city.
    // Provide safe defaults so CDEK can return at least some PVZ.
    if (data.country_code == null) data.country_code = 'RU'
    if (data.type == null) data.type = 'PVZ'

    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null) continue
      qs.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
    const res = await fetch(`${baseUrl}/deliverypoints?${qs.toString()}`, { headers })
    const text = await res.text()
    return { status: res.status, text }
  }

  headers['Content-Type'] = 'application/json'
  const res = await fetch(`${baseUrl}/calculator/tarifflist`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  const text = await res.text()
  return { status: res.status, text }
}

async function calculateForWidgetTariffs(params: {
  data: Record<string, unknown>
  credentials: NonNullable<Awaited<ReturnType<typeof settingsService.getCdekCredentials>>>
  senderFromLocation: CdekLocation
}) {
  const parsed = calculatorPayloadSchema.safeParse(params.data)
  if (!parsed.success) {
    return json({ message: 'Widget calculate payload is invalid' }, { status: 400 })
  }

  try {
    const tariffs = await calculateCdekTariffList(
      {
        from_location: params.senderFromLocation,
        to_location: parsed.data.to_location,
        packages: parsed.data.packages,
        type: parsed.data.type,
        currency: parsed.data.currency,
        lang: parsed.data.lang,
        services: parsed.data.services,
        date: parsed.data.date,
        tariff_codes: [...WIDGET_TARIFF_CODES],
      },
      params.credentials
    )

    return json(
      {
        tariff_codes: tariffs,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'CDEK widget calculate error'
    return json({ message }, { status: 500 })
  }
}

async function parseIncoming(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url)
  const fromQuery: Record<string, unknown> = {}
  url.searchParams.forEach((value, key) => {
    fromQuery[key] = value
  })

  if (request.method !== 'POST') return fromQuery

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return fromQuery

  try {
    const body = (await request.json()) as unknown
    if (body && typeof body === 'object') return { ...fromQuery, ...(body as Record<string, unknown>) }
    return fromQuery
  } catch {
    return fromQuery
  }
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}

async function handle(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const cdekCredentials =
      (await settingsService.getCdekCredentials({ brandId })) ??
      (await settingsService.getCdekCredentials({}))
    if (!cdekCredentials) {
      return json({ message: 'CDEK credentials are missing in admin settings' }, { status: 400 })
    }

    const incoming = normalizeWidgetPayload(await parseIncoming(request))
    const parsed = requestSchema.safeParse(incoming)
    if (!parsed.success) return json({ message: 'Action is required' }, { status: 400 })

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.action === 'calculate') {
      const senderSettingsResult = await resolveCdekSenderSettings({
        brandId,
        overrideCredentials: cdekCredentials,
        validatePvzCity: true,
      })
      if (!senderSettingsResult.ok) {
        const message =
          'error' in senderSettingsResult ? senderSettingsResult.error : 'CDEK sender settings error'
        return json({ message }, { status: 400 })
      }

      delete data.from
      delete data.from_location
      data.from_location = senderSettingsResult.settings.calculatorFromLocation

      return calculateForWidgetTariffs({
        data,
        credentials: cdekCredentials,
        senderFromLocation: senderSettingsResult.settings.calculatorFromLocation,
      })
    }

    const token = await getCdekToken(cdekCredentials)
    const baseUrl = buildCdekBaseUrl(cdekCredentials.useTest)
    const { status, text } = await proxyToCdek({
      baseUrl,
      token,
      action: parsed.data.action,
      data,
    })

    return new NextResponse(text, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Version': '3.11.1',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'CDEK widget service error'
    return json({ message }, { status: 500 })
  }
}
