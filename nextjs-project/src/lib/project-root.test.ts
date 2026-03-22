import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'

describe('getProjectRoot', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.PROJECT_ROOT
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses PROJECT_ROOT when set', async () => {
    process.env.PROJECT_ROOT = '/custom/project'
    const { getProjectRoot } = await import('./project-root')
    expect(getProjectRoot()).toBe(path.resolve('/custom/project'))
  })

  it('resolves two levels up when cwd is .next/standalone', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(path.join('/app', '.next', 'standalone'))
    const { getProjectRoot } = await import('./project-root')
    expect(getProjectRoot()).toBe(path.resolve('/app'))
  })

  it('returns cwd when not in standalone bundle', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/Users/dev/innerhealth/nextjs-project')
    const { getProjectRoot } = await import('./project-root')
    expect(getProjectRoot()).toBe(path.resolve('/Users/dev/innerhealth/nextjs-project'))
  })
})
