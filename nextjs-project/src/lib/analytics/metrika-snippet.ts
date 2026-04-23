import 'server-only'

export interface ParsedMetrikaSnippet {
  scriptType: string | undefined
  scriptInner: string
  noscriptInner: string | null
}

export function parseMetrikaSnippet(code: string | null | undefined): ParsedMetrikaSnippet | null {
  const raw = code ?? ''
  if (raw.trim().length === 0) return null

  const scriptMatch = raw.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/i)
  const scriptInner = scriptMatch?.[2]
  if (!scriptInner) return null

  const attrs = scriptMatch?.[1] ?? ''
  const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)
  const scriptType = typeMatch?.[1]?.trim()

  const noscriptMatch = raw.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/i)
  const noscriptInner = noscriptMatch?.[1] ?? null

  return { scriptType, scriptInner, noscriptInner: noscriptInner?.trim() ? noscriptInner : null }
}

