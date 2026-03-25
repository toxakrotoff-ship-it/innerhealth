import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCdekToken } from '@/lib/cdek'
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

function normalizeWidgetPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const action = payload.action
  if (action !== 'calculate') return payload

  const normalized: Record<string, unknown> = { ...payload }

  // Widget v3 often operates with `from` / `to` / `goods` in config.
  // Its service payload may contain `from`/`to` and/or `goods` instead of CDEK API's `*_location` and `packages`.
  if (normalized.from_location == null && normalized.from != null && typeof normalized.from === 'object') {
    normalized.from_location = normalized.from
  }
  if (normalized.to_location == null && normalized.to != null && typeof normalized.to === 'object') {
    normalized.to_location = normalized.to
  }

  if (normalized.packages == null && Array.isArray(normalized.goods)) {
    const goods = normalized.goods as Array<Record<string, unknown>>
    const packages = goods
      .map((g) => {
        const weight = typeof g.weight === 'number' ? g.weight : Number.parseInt(String(g.weight ?? ''), 10)
        const length = typeof g.length === 'number' ? g.length : Number.parseInt(String(g.length ?? ''), 10)
        const width = typeof g.width === 'number' ? g.width : Number.parseInt(String(g.width ?? ''), 10)
        const height = typeof g.height === 'number' ? g.height : Number.parseInt(String(g.height ?? ''), 10)
        if (![weight, length, width, height].every((v) => Number.isFinite(v) && v > 0)) return null
        return { weight, length, width, height }
      })
      .filter((p): p is { weight: number; length: number; width: number; height: number } => p !== null)

    if (packages.length > 0) normalized.packages = packages
  }

  return normalized
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

    const token = await getCdekToken(cdekCredentials)
    const baseUrl = buildCdekBaseUrl(cdekCredentials.useTest)
    const { status, text } = await proxyToCdek({
      baseUrl,
      token,
      action: parsed.data.action,
      data: parsed.data,
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

