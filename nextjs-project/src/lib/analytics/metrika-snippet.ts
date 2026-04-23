import 'server-only'

export interface ParsedMetrikaSnippet {
  scriptType: string | undefined
  scriptInner: string
  noscriptInner: string | null
}

export function parseMetrikaSnippet(code: string | null | undefined): ParsedMetrikaSnippet | null {
  const trimmed = (code ?? '').trim()
  if (!trimmed) return null

  const scriptMatch = trimmed.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/i)
  const scriptInner = scriptMatch?.[2]?.trim()
  if (!scriptInner) return null

  const attrs = scriptMatch?.[1] ?? ''
  const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)
  const scriptType = typeMatch?.[1]?.trim()

  const noscriptMatch = trimmed.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/i)
  const noscriptInner = noscriptMatch?.[1]?.trim() ? noscriptMatch[1].trim() : null

  return { scriptType, scriptInner, noscriptInner }
}

