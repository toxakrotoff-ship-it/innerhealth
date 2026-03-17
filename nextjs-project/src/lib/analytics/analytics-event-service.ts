import 'server-only'

import { type AnalyticsEvent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  analyticsEventInputArraySchema,
  analyticsEventInputSchema,
  type AnalyticsEventInput,
} from './analytics-event-schema'

interface AnalyticsContext {
  readonly ipHash?: string
  readonly userAgent?: string
}

type AnalyticsEventWithContext = AnalyticsEventInput & AnalyticsContext

export async function createAnalyticsEvent(
  input: AnalyticsEventWithContext
): Promise<AnalyticsEvent> {
  const parsed = analyticsEventInputSchema.parse(input)

  const anyPrisma = prisma as unknown as {
    analyticsEvent?: {
      create: (args: unknown) => Promise<AnalyticsEvent>
      createMany: (args: unknown) => Promise<{ count: number }>
    }
  }

  if (!anyPrisma.analyticsEvent) {
    // Модели аналитики ещё не смигрированы в основном Prisma‑клиенте —
    // молча пропускаем запись, чтобы не ломать сайт.
    // eslint-disable-next-line no-console
    console.debug(
      'AnalyticsEvent model is not available in Prisma client, skipping single write'
    )
    return {
      id: 'noop',
      occurredAt: parsed.occurredAt,
      userId: parsed.userId ?? null,
      sessionId: parsed.sessionId ?? null,
      anonId: parsed.anonId ?? null,
      type: parsed.type as never,
      path: parsed.path,
      pageTitle: parsed.pageTitle ?? null,
      meta: parsed.meta ?? null,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
    } as AnalyticsEvent
  }

  try {
    const created = await anyPrisma.analyticsEvent.create({
      data: {
        occurredAt: parsed.occurredAt,
        userId: parsed.userId,
        sessionId: parsed.sessionId,
        anonId: parsed.anonId,
        type: parsed.type,
        path: parsed.path,
        pageTitle: parsed.pageTitle,
        meta: parsed.meta,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
      },
    })

    return created
  } catch (err) {
    console.error('Failed to create analytics event', {
      error: err,
      type: parsed.type,
      path: parsed.path,
      sessionId: parsed.sessionId,
    })
    throw err
  }
}

export async function createAnalyticsEventsBatch(
  inputs: readonly AnalyticsEventWithContext[]
): Promise<{ insertedCount: number }> {
  if (inputs.length === 0) {
    return { insertedCount: 0 }
  }

  const parsedArray = analyticsEventInputArraySchema.parse(inputs)

  const anyPrisma = prisma as unknown as {
    analyticsEvent?: {
      createMany: (args: unknown) => Promise<{ count: number }>
    }
  }

  if (!anyPrisma.analyticsEvent) {
    // eslint-disable-next-line no-console
    console.debug(
      'AnalyticsEvent model is not available in Prisma client, skipping batch write'
    )
    return { insertedCount: 0 }
  }

  try {
    const result = await anyPrisma.analyticsEvent.createMany({
      data: parsedArray.map((item) => ({
        occurredAt: item.occurredAt,
        userId: item.userId,
        sessionId: item.sessionId,
        anonId: item.anonId,
        type: item.type,
        path: item.path,
        pageTitle: item.pageTitle,
        meta: item.meta,
        // IP и user agent не включаем в batch для упрощения:
        // при необходимости можно расширить DTO и схему.
      })),
      skipDuplicates: true,
    })

    return { insertedCount: result.count }
  } catch (err) {
    console.error('Failed to create analytics events batch', {
      error: err,
      count: inputs.length,
    })
    throw err
  }
}

