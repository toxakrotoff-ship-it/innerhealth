/* eslint-disable no-console */
import 'dotenv/config'
import { parseArgs } from 'node:util'
import path from 'node:path'

// Важно: путь к корню Next.js-проекта
const projectRoot = path.join(__dirname, '..')

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { aggregateForDateRange } = require(path.join(
  projectRoot,
  'src/lib/analytics/aggregation-service'
)) as {
  aggregateForDateRange: (from: Date, to: Date) => Promise<void>
}

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

