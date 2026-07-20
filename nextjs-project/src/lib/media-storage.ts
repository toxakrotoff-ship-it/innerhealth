import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { promises as fs } from 'fs'
import path from 'path'
import { getProjectRoot } from '@/lib/project-root'

const MANAGED_UPLOAD_PREFIX = '/uploads/'
const PUBLIC_UPLOAD_CACHE_CONTROL = 'public, max-age=31536000, immutable'

let s3Client: S3Client | null = null

function getS3Config() {
  const bucket = process.env.S3_BUCKET?.trim()
  const region = process.env.S3_REGION?.trim()
  const endpoint = process.env.S3_ENDPOINT?.trim()
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim()
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim()

  return {
    bucket: bucket || null,
    region: region || null,
    endpoint: endpoint || null,
    accessKeyId: accessKeyId || null,
    secretAccessKey: secretAccessKey || null,
    publicBaseUrl: publicBaseUrl || null,
  }
}

export function isS3MediaStorageEnabled(): boolean {
  const config = getS3Config()
  return Boolean(
    config.bucket &&
      config.region &&
      config.endpoint &&
      config.accessKeyId &&
      config.secretAccessKey &&
      config.publicBaseUrl
  )
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client

  const config = getS3Config()
  if (
    !config.bucket ||
    !config.region ||
    !config.endpoint ||
    !config.accessKeyId ||
    !config.secretAccessKey
  ) {
    throw new Error('S3 media storage is not fully configured')
  }

  s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return s3Client
}

export function normalizeManagedUploadPath(filePath: string): string {
  const trimmed = filePath.trim()
  const ensured = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const normalized = path.posix.normalize(ensured)

  if (!normalized.startsWith(MANAGED_UPLOAD_PREFIX)) {
    throw new Error(`Managed upload path must start with ${MANAGED_UPLOAD_PREFIX}`)
  }
  if (normalized.includes('\0')) {
    throw new Error('Managed upload path contains invalid characters')
  }
  if (normalized.split('/').includes('..')) {
    throw new Error('Managed upload path traversal is not allowed')
  }

  return normalized
}

export function getManagedUploadObjectKey(filePath: string): string {
  return normalizeManagedUploadPath(filePath).replace(/^\/+/, '')
}

export function buildManagedUploadPath(...segments: string[]): string {
  const sanitizedSegments = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))

  return normalizeManagedUploadPath(path.posix.join(MANAGED_UPLOAD_PREFIX, ...sanitizedSegments))
}

export function getManagedUploadPublicUrl(filePath: string): string {
  const publicBaseUrl = getS3Config().publicBaseUrl
  if (!publicBaseUrl) {
    throw new Error('S3_PUBLIC_BASE_URL is required to build public upload URLs')
  }

  const normalizedBase = publicBaseUrl.replace(/\/+$/, '')
  return `${normalizedBase}/${getManagedUploadObjectKey(filePath)}`
}

function getLocalUploadAbsolutePath(filePath: string): string {
  const normalized = normalizeManagedUploadPath(filePath)
  return path.join(getProjectRoot(), 'public', normalized.replace(/^\/+/, ''))
}

export function guessContentTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.avif':
      return 'image/avif'
    case '.svg':
      return 'image/svg+xml'
    case '.pdf':
      return 'application/pdf'
    case '.txt':
      return 'text/plain; charset=utf-8'
    case '.json':
      return 'application/json'
    default:
      return 'application/octet-stream'
  }
}

export interface ManagedUploadListItem {
  readonly url: string
  readonly objectKey: string
  readonly name: string
  readonly folder: string
  readonly mimeType: string
  readonly size: number | null
  readonly lastModified: string | null
}

function getManagedUploadFolder(filePath: string): string {
  const normalized = normalizeManagedUploadPath(filePath)
  const [, uploads, folder] = normalized.split('/')
  if (uploads !== 'uploads' || !folder) {
    throw new Error(`Failed to resolve managed upload folder for ${filePath}`)
  }
  return folder
}

function isManagedUploadTypeAllowed(filePath: string, kind: 'image' | 'document'): boolean {
  const mimeType = guessContentTypeFromPath(filePath)
  if (kind === 'image') return mimeType.startsWith('image/')
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
}

async function listLocalManagedUploads(folder: string, kind: 'image' | 'document') {
  const baseDir = path.join(getProjectRoot(), 'public', 'uploads', folder)
  const exists = await fs
    .stat(baseDir)
    .then((stat) => stat.isDirectory())
    .catch(() => false)

  if (!exists) return [] as ManagedUploadListItem[]

  const walk = async (dirPath: string): Promise<ManagedUploadListItem[]> => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) return walk(fullPath)
        if (!entry.isFile()) return []

        const relative = path.relative(path.join(getProjectRoot(), 'public'), fullPath).replace(/\\/g, '/')
        const filePath = normalizeManagedUploadPath(`/${relative}`)
        if (!isManagedUploadTypeAllowed(filePath, kind)) return []

        const stat = await fs.stat(fullPath)
        return [
          {
            url: filePath,
            objectKey: getManagedUploadObjectKey(filePath),
            name: path.basename(fullPath),
            folder: getManagedUploadFolder(filePath),
            mimeType: guessContentTypeFromPath(fullPath),
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          } satisfies ManagedUploadListItem,
        ]
      })
    )

    return nested.flat()
  }

  return walk(baseDir)
}

async function listS3ManagedUploads(folder: string, kind: 'image' | 'document') {
  const prefix = `uploads/${folder}/`
  const client = getS3Client()
  const { bucket } = getS3Config()
  const items: ManagedUploadListItem[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket!,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    )

    for (const object of response.Contents ?? []) {
      if (!object.Key || object.Key.endsWith('/')) continue
      const url = normalizeManagedUploadPath(`/${object.Key}`)
      if (!isManagedUploadTypeAllowed(url, kind)) continue

      items.push({
        url,
        objectKey: object.Key,
        name: path.posix.basename(object.Key),
        folder: getManagedUploadFolder(url),
        mimeType: guessContentTypeFromPath(object.Key),
        size: typeof object.Size === 'number' ? object.Size : null,
        lastModified: object.LastModified?.toISOString() ?? null,
      })
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  return items
}

export async function listManagedUploads(params: {
  folders: string[]
  kind: 'image' | 'document'
  limit?: number
}): Promise<ManagedUploadListItem[]> {
  const uniqueFolders = Array.from(
    new Set(
      params.folders
        .map((folder) => folder.trim().replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)
    )
  )

  const nested = await Promise.all(
    uniqueFolders.map((folder) =>
      isS3MediaStorageEnabled()
        ? listS3ManagedUploads(folder, params.kind)
        : listLocalManagedUploads(folder, params.kind)
    )
  )

  return nested
    .flat()
    .sort((a, b) => {
      const aTime = a.lastModified ? Date.parse(a.lastModified) : 0
      const bTime = b.lastModified ? Date.parse(b.lastModified) : 0
      if (aTime !== bTime) return bTime - aTime
      return a.name.localeCompare(b.name, 'ru')
    })
    .slice(0, params.limit ?? 200)
}

export async function uploadManagedUpload(params: {
  filePath: string
  buffer: Buffer
  contentType?: string | null
  cacheControl?: string
}): Promise<{ url: string; objectKey: string }> {
  const normalizedPath = normalizeManagedUploadPath(params.filePath)
  const objectKey = getManagedUploadObjectKey(normalizedPath)

  if (isS3MediaStorageEnabled()) {
    const client = getS3Client()
    const { bucket } = getS3Config()

    await client.send(
      new PutObjectCommand({
        Bucket: bucket!,
        Key: objectKey,
        Body: params.buffer,
        ContentType: params.contentType ?? guessContentTypeFromPath(normalizedPath),
        CacheControl: params.cacheControl ?? PUBLIC_UPLOAD_CACHE_CONTROL,
      })
    )
  } else {
    const absolutePath = getLocalUploadAbsolutePath(normalizedPath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, params.buffer)
  }

  return {
    url: normalizedPath,
    objectKey,
  }
}

export async function deleteManagedUpload(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return

  const normalizedPath = normalizeManagedUploadPath(fileUrl)

  if (isS3MediaStorageEnabled()) {
    const client = getS3Client()
    const { bucket } = getS3Config()

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket!,
        Key: getManagedUploadObjectKey(normalizedPath),
      })
    )
    return
  }

  const absolutePath = getLocalUploadAbsolutePath(normalizedPath)
  try {
    await fs.unlink(absolutePath)
  } catch (error) {
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as NodeJS.ErrnoException).code === 'string'
        ? (error as NodeJS.ErrnoException).code
        : undefined

    if (code !== 'ENOENT') throw error
  }
}

export async function readManagedUpload(filePath: string): Promise<Buffer> {
  const normalizedPath = normalizeManagedUploadPath(filePath)

  if (isS3MediaStorageEnabled()) {
    const client = getS3Client()
    const { bucket } = getS3Config()
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket!,
        Key: getManagedUploadObjectKey(normalizedPath),
      })
    )

    if (!response.Body) {
      throw new Error(`Managed upload body is empty for ${normalizedPath}`)
    }

    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
  }

  const absolutePath = getLocalUploadAbsolutePath(normalizedPath)
  return fs.readFile(absolutePath)
}

export const managedUploadCacheControl = PUBLIC_UPLOAD_CACHE_CONTROL
