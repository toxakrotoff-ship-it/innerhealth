/**
 * Запись проверенных учётных данных из настроек в файл, подгружаемый в process.env при старте.
 * Задайте CREDENTIALS_ENV_FILE (путь к файлу). После успешной проверки подключения в админке
 * значения из настроек записываются в этот файл; при следующем запуске процесса они загрузятся в env.
 */
import { readFile, writeFile, chmod } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ENV_FILE_KEY = 'CREDENTIALS_ENV_FILE'

/** Ключи, которые мы пишем в файл (имена переменных окружения). */
export const CREDENTIAL_ENV_KEYS = [
  'YOOKASSA_SHOP_ID',
  'YOOKASSA_SECRET_KEY',
  'CDEK_CLIENT_ID',
  'CDEK_CLIENT_SECRET',
  'TELEGRAM_BOT_TOKEN',
] as const

function getCredentialsEnvPath(): string | null {
  const path = process.env[ENV_FILE_KEY]?.trim()
  return path || null
}

/**
 * Парсит .env-подобный файл: строки KEY=VALUE, пустые и #-комментарии пропускаем.
 */
function parseEnvContent(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/\\'/g, "'")
    }
    out[key] = value
  }
  return out
}

/**
 * Сериализует объект в .env-формат. Значения с переносами/кавычками экранируются.
 */
function serializeEnvContent(map: Record<string, string>): string {
  const lines: string[] = []
  for (const key of Object.keys(map).sort()) {
    const value = map[key] ?? ''
    const needsQuotes = /[\n"=\s]/.test(value)
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
    lines.push(needsQuotes ? `${key}="${escaped}"` : `${key}=${value}`)
  }
  return lines.join('\n') + '\n'
}

/**
 * Объединяет текущее содержимое файла с переданными ключами и записывает файл.
 * Вызывать только после успешной проверки подключения (учётные данные из настроек).
 */
export async function mergeAndWriteCredentials(updates: Partial<Record<(typeof CREDENTIAL_ENV_KEYS)[number], string>>): Promise<void> {
  const path = getCredentialsEnvPath()
  if (!path) return

  const filtered: Record<string, string> = {}
  for (const key of CREDENTIAL_ENV_KEYS) {
    const v = updates[key]
    if (v != null && String(v).trim()) filtered[key] = String(v).trim()
  }
  if (Object.keys(filtered).length === 0) return

  let existing: Record<string, string> = {}
  if (existsSync(path)) {
    try {
      const content = await readFile(path, 'utf8')
      existing = parseEnvContent(content)
    } catch {
      // файл занят или нет прав — не перезаписываем
    }
  }

  const merged = { ...existing, ...filtered }
  const dir = dirname(path)
  try {
    await writeFile(path, serializeEnvContent(merged), { mode: 0o600, flag: 'w' })
    try {
      await chmod(path, 0o600)
    } catch {
      // chmod не критичен на всех ФС
    }
  } catch (err) {
    console.error('[credentials-env-file] Failed to write', path, err)
    throw err
  }
}

/**
 * Загружает файл CREDENTIALS_ENV_FILE в process.env. Вызывается при старте (instrumentation).
 */
export function loadCredentialsIntoProcessEnv(): void {
  const path = getCredentialsEnvPath()
  if (!path || !existsSync(path)) return
  try {
    const content = readFileSync(path, 'utf8')
    const map = parseEnvContent(content)
    for (const [key, value] of Object.entries(map)) {
      if (key && value !== undefined) process.env[key] = value
    }
  } catch (err) {
    console.error('[credentials-env-file] Failed to load', path, err)
  }
}
