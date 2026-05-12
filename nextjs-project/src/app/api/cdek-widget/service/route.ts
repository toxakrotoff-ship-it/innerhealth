import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  calculateCdekTariffList,
  getCdekToken,
  resolveCdekSenderSettings,
  type CdekLocation,
  type CdekCalculatorTariffListRequest,
  type ResolvedCdekSenderSettings,
} from '@/lib/cdek'
import { normalizeWidgetPayload } from '@/lib/cdek-widget-payload'
import * as settingsService from '@/services/settings.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

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
  additional_order_types: z.array(z.number().int().positive()).optional(),
  date: z.union([z.string(), z.number()]).optional(),
})

type WidgetTariffAttempt = {
  name: string
  request: CdekCalculatorTariffListRequest
}

type WidgetDeliveryMode = 'office' | 'door'

type WidgetDestinationLike = {
  code?: unknown
  postal_code?: unknown
  address?: unknown
}

function summarizeLocation(location: CdekLocation | undefined): Record<string, unknown> | null {
  if (!location) return null
  return {
    code: location.code ?? null,
    postal_code: location.postal_code ?? null,
    city_uuid: location.city_uuid ?? null,
    address: location.address ?? null,
    country_code: location.country_code ?? null,
  }
}

function hasDestination(toLocation: WidgetDestinationLike | undefined): boolean {
  if (!toLocation) return false
  const hasCode =
    typeof toLocation.code === 'number'
      ? Number.isFinite(toLocation.code) && toLocation.code > 0
      : typeof toLocation.code === 'string' && toLocation.code.trim().length > 0

  const hasPostalCode =
    typeof toLocation.postal_code === 'string' && toLocation.postal_code.trim().length > 0

  const hasAddress =
    typeof toLocation.address === 'string' && toLocation.address.trim().length > 0

  return hasCode || hasPostalCode || hasAddress
}

function detectWidgetDeliveryMode(
  toLocation: WidgetDestinationLike | undefined
): WidgetDeliveryMode | null {
  if (!toLocation) return null

  const hasPostalCode =
    typeof toLocation.postal_code === 'string' && toLocation.postal_code.trim().length > 0
  const hasAddress =
    typeof toLocation.address === 'string' && toLocation.address.trim().length > 0

  if (hasPostalCode || hasAddress) return 'door'

  const hasCode =
    typeof toLocation.code === 'number'
      ? Number.isFinite(toLocation.code) && toLocation.code > 0
      : typeof toLocation.code === 'string' && toLocation.code.trim().length > 0

  return hasCode ? 'office' : null
}

function logWidgetAttempt(params: {
  brandId: string | null
  name: string
  request: CdekCalculatorTariffListRequest
}) {
  const { brandId, name, request } = params
  console.warn('[cdek/widget][calculate] attempt', {
    brandId,
    name,
    tariff_codes: request.tariff_codes,
    type: request.type ?? 1,
    currency: request.currency ?? 1,
    lang: request.lang ?? 'rus',
    date: request.date ?? null,
    additional_order_types: request.additional_order_types ?? [],
    from_location: summarizeLocation(request.from_location),
    to_location: summarizeLocation(request.to_location),
    packages: request.packages,
  })
}

async function buildWidgetTariffAttempts(params: {
  request: z.infer<typeof calculatorPayloadSchema>
  senderSettings: ResolvedCdekSenderSettings
  mode: WidgetDeliveryMode
}): Promise<WidgetTariffAttempt[]> {
  const { request, senderSettings, mode } = params
  const tariffCodes = mode === 'office' ? [136] : [137]

  const baseRequest: CdekCalculatorTariffListRequest = {
    from_location: senderSettings.calculatorFromLocation,
    to_location: request.to_location as CdekLocation,
    packages: request.packages,
    type: 1,
    currency: request.currency,
    lang: request.lang,
    services: request.services,
    tariff_codes: tariffCodes,
  }

  return [{ name: mode, request: baseRequest }]
}

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
  brandId: string | null
  data: Record<string, unknown>
  credentials: NonNullable<Awaited<ReturnType<typeof settingsService.getCdekCredentials>>>
  senderSettings: ResolvedCdekSenderSettings
}) {
  const parsed = calculatorPayloadSchema.safeParse(params.data)
  if (!parsed.success) {
    return json({ message: 'Widget calculate payload is invalid' }, { status: 400 })
  }

  const attempts = await buildWidgetTariffAttempts({
    request: parsed.data,
    senderSettings: params.senderSettings,
    mode: detectWidgetDeliveryMode(parsed.data.to_location) ?? 'door',
  })

  try {
    let lastError: unknown = null

    for (const attempt of attempts) {
      try {
        logWidgetAttempt({
          brandId: params.brandId,
          name: attempt.name,
          request: attempt.request,
        })

        const tariffs = await calculateCdekTariffList(attempt.request, params.credentials)
        if (tariffs.length > 0) {
          console.warn('[cdek/widget][calculate] success', {
            brandId: params.brandId,
            name: attempt.name,
            tariffs: tariffs.map((t) => ({
              tariff_code: t.tariff_code ?? null,
              delivery_sum: t.delivery_sum ?? null,
              tariff_name: t.tariff_name ?? null,
              delivery_mode: t.delivery_mode ?? null,
            })),
          })

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
        }

        console.warn('[cdek/widget][calculate] empty result', {
          brandId: params.brandId,
          name: attempt.name,
        })
      } catch (e) {
        lastError = e
        const message = e instanceof Error ? e.message : 'CDEK widget calculate error'
        console.warn('[cdek/widget][calculate] failed', {
          brandId: params.brandId,
          name: attempt.name,
          message,
        })
      }
    }

    throw lastError ?? new Error('All widget tariff attempts returned empty results')
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

function summarizeIncomingPayload(data: Record<string, unknown>): Record<string, unknown> {
  const from = data.from
  const fromLocation = data.from_location
  const to = data.to
  const toLocation = data.to_location
  const goods = Array.isArray(data.goods) ? data.goods : []
  const packages = Array.isArray(data.packages) ? data.packages : []

  const summarizeUnknownLocation = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') return null
    const location = value as Record<string, unknown>
    return {
      code: location.code ?? null,
      city_code: location.city_code ?? null,
      city_uuid: location.city_uuid ?? null,
      postal_code: location.postal_code ?? null,
      address: location.address ?? null,
      country_code: location.country_code ?? null,
      delivery_point: location.delivery_point ?? null,
    }
  }

  return {
    action: data.action ?? null,
    from: summarizeUnknownLocation(from),
    from_location: summarizeUnknownLocation(fromLocation),
    to: summarizeUnknownLocation(to),
    to_location: summarizeUnknownLocation(toLocation),
    goods,
    packages,
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

    const rawIncoming = await parseIncoming(request)
    const incoming = normalizeWidgetPayload(rawIncoming)

    const parsed = requestSchema.safeParse(incoming)
    if (!parsed.success) return json({ message: 'Action is required' }, { status: 400 })

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.action === 'calculate') {
      console.warn('[cdek/widget][incoming][normalized]', {
        brandId,
        payload: summarizeIncomingPayload(incoming),
      })

      const toLocation =
        data.to_location && typeof data.to_location === 'object'
          ? (data.to_location as WidgetDestinationLike)
          : undefined

      if (!hasDestination(toLocation)) {
        console.warn('[cdek/widget][calculate][skip]', {
          brandId,
          reason: 'empty destination',
          to_location: summarizeIncomingPayload({ to_location: data.to_location }).to_location,
        })

        return json(
          {
            tariff_codes: [],
            ok: false,
            code: 'EMPTY_DESTINATION',
            message: 'Недостаточно данных для расчета доставки',
          },
          {
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      }

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
        brandId,
        data,
        credentials: cdekCredentials,
        senderSettings: senderSettingsResult.settings,
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
