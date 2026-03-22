import path from 'path'

/**
 * Resolves the repository root for filesystem paths (`public/`, `.env`).
 *
 * When running `node .next/standalone/server.js`, `process.cwd()` is `.next/standalone`,
 * not the project root — static assets and uploads must resolve two levels up.
 * Optional override: `PROJECT_ROOT` (absolute path).
 */
export function getProjectRoot(): string {
  const explicit = process.env.PROJECT_ROOT
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return path.resolve(explicit.trim())
  }
  const cwd = process.cwd()
  const normalized = cwd.replace(/\\/g, '/')
  if (normalized.endsWith('/.next/standalone')) {
    return path.resolve(cwd, '..', '..')
  }
  return cwd
}
