import path from 'path'

function resolveStandaloneBundleRoot(): string | null {
  const entry = process.argv[1]
  if (!entry || typeof entry !== 'string') return null
  const absoluteScript = path.isAbsolute(entry) ? entry : path.resolve(process.cwd(), entry)
  const scriptDir = path.dirname(absoluteScript).replace(/\\/g, '/')
  if (scriptDir.endsWith('/.next/standalone')) {
    return path.resolve(scriptDir, '..', '..')
  }
  return null
}

/**
 * Resolves the repository root for filesystem paths (`public/`, `.env`).
 *
 * When running `node .next/standalone/server.js`, `process.cwd()` is sometimes `/app`
 * (Docker WORKDIR) and sometimes `.next/standalone` after chdir — uploads must not rely on cwd alone.
 * Detection order: `PROJECT_ROOT` → path of the standalone `server.js` → cwd ending with `.next/standalone` → cwd.
 */
export function getProjectRoot(): string {
  const explicit = process.env.PROJECT_ROOT
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return path.resolve(explicit.trim())
  }

  const fromArgv = resolveStandaloneBundleRoot()
  if (fromArgv) return fromArgv

  const cwd = process.cwd()
  const normalized = cwd.replace(/\\/g, '/')
  if (normalized.endsWith('/.next/standalone')) {
    return path.resolve(cwd, '..', '..')
  }
  return cwd
}
