import 'server-only'

import { z } from 'zod'
import { notifyTelegramInfraAlert } from '@/lib/telegram-notify'
import { notifyMaxInfraAlert } from '@/lib/max-notify'

const infraAlertSchema = z.object({
  kind: z.enum(['disk', 'memory', 'cpu', 'container', 'custom']),
  severity: z.enum(['info', 'warn', 'critical']),
  message: z.string().min(1).max(2000),
})

export async function POST(req: Request): Promise<Response> {
  const expectedToken = process.env.INFRA_ALERT_TOKEN
  if (!expectedToken) {
    return Response.json({ error: 'Infra alerts are not configured' }, { status: 500 })
  }

  const actualToken = req.headers.get('x-infra-alert-token')
  if (!actualToken || actualToken !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = infraAlertSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await notifyTelegramInfraAlert(parsed.data)
  await notifyMaxInfraAlert(parsed.data)
  return Response.json({ ok: true })
}

