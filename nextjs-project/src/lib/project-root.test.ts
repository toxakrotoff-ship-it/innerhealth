import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'

describe('getProjectRoot', () => {
  const originalArgv = [...process.argv]

  beforeEach(() => {
    vi.resetModules()
    delete process.env.PROJECT_ROOT
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    process.argv = [...originalArgv]
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

  it('resolves app root from standalone server.js path when cwd is not under standalone', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/tmp')
    process.argv = ['node', path.join('/app', '.next', 'standalone', 'server.js')]
    const { getProjectRoot } = await import('./project-root')
    expect(getProjectRoot()).toBe(path.resolve('/app'))
  })

  it('resolves app root from relative standalone server.js path', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/app')
    process.argv = ['node', '.next/standalone/server.js']
    const { getProjectRoot } = await import('./project-root')
    expect(getProjectRoot()).toBe(path.resolve('/app'))
  })
})
