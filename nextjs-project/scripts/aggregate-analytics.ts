import 'dotenv/config'
import { parseArgs } from 'node:util'
import { aggregateForDateRange } from '../src/lib/analytics/aggregation-service'

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed
}

async function main() {
  const args = parseArgs({
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const from = parseDate(args.values.from as string | undefined, yesterday)
  const to = parseDate(args.values.to as string | undefined, from)

  console.log(
    `Aggregating analytics from ${from.toISOString().slice(0, 10)} to ${to
      .toISOString()
      .slice(0, 10)}`
  )

  await aggregateForDateRange(from, to)

  console.log('Aggregation completed.')
}

main().catch((err) => {
  console.error('Aggregation failed:', err)
  process.exitCode = 1
})

