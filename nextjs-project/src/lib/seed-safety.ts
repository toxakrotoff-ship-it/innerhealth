export type SeedExecutionMode = 'dry-run' | 'apply'

/**
 * Seeds are operational tools, never a deploy step. Requiring an explicit
 * write flag keeps an accidental `npm run seed:*` read-only.
 */
export function getSeedExecutionMode(argv: readonly string[] = process.argv.slice(2)): SeedExecutionMode {
  const apply = argv.includes('--apply')
  const dryRun = argv.includes('--dry-run')

  if (apply && dryRun) {
    throw new Error('Передайте только один флаг: --dry-run или --apply')
  }

  return apply ? 'apply' : 'dry-run'
}
