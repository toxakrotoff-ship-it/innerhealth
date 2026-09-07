import { describe, expect, it } from 'vitest'

import { getSeedExecutionMode } from './seed-safety'

describe('getSeedExecutionMode', () => {
  it('is read-only by default', () => {
    expect(getSeedExecutionMode([])).toBe('dry-run')
  })

  it('requires an explicit apply flag for writes', () => {
    expect(getSeedExecutionMode(['--apply'])).toBe('apply')
  })

  it('rejects contradictory flags', () => {
    expect(() => getSeedExecutionMode(['--dry-run', '--apply'])).toThrow(
      'Передайте только один флаг'
    )
  })
})
