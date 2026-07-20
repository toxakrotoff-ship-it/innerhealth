#!/usr/bin/env ts-node

import { promises as fs } from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import {
  guessContentTypeFromPath,
  isS3MediaStorageEnabled,
  normalizeManagedUploadPath,
  uploadManagedUpload,
} from '../src/lib/media-storage'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

async function collectFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) return collectFiles(fullPath)
      if (entry.isFile()) return [fullPath]
      return []
    })
  )

  return files.flat()
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const deleteLocal = process.argv.includes('--delete-local')

  if (!isS3MediaStorageEnabled()) {
    throw new Error('S3 storage is not configured. Set S3_* env vars before migration.')
  }

  const uploadsExists = await fs
    .stat(LOCAL_UPLOADS_DIR)
    .then((stat) => stat.isDirectory())
    .catch(() => false)

  if (!uploadsExists) {
    console.log(`Локальная папка не найдена: ${LOCAL_UPLOADS_DIR}`)
    return
  }

  const files = await collectFiles(LOCAL_UPLOADS_DIR)
  console.log(`Найдено файлов для переноса: ${files.length}`)

  let uploaded = 0

  for (const fullPath of files) {
    const relativePath = path.relative(path.join(process.cwd(), 'public'), fullPath).replace(/\\/g, '/')
    const managedPath = normalizeManagedUploadPath(`/${relativePath}`)

    if (dryRun) {
      console.log(`[DRY RUN] ${managedPath}`)
      continue
    }

    const buffer = await fs.readFile(fullPath)
    await uploadManagedUpload({
      filePath: managedPath,
      buffer,
      contentType: guessContentTypeFromPath(fullPath),
    })
    uploaded++
    console.log(`[OK] ${managedPath}`)

    if (deleteLocal) {
      await fs.unlink(fullPath)
    }
  }

  console.log(`Перенос завершен. Загружено: ${uploaded}`)
  if (dryRun) {
    console.log('Dry run завершен без загрузки файлов.')
  }
  if (deleteLocal && !dryRun) {
    console.log('Локальные файлы удалены после успешной загрузки.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
