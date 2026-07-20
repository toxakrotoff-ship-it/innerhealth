import { NextResponse } from 'next/server'
import {
  guessContentTypeFromPath,
  managedUploadCacheControl,
  normalizeManagedUploadPath,
  readManagedUpload,
} from '@/lib/media-storage'

function resolveManagedUploadPath(pathSegments: string[] | undefined): string | null {
  if (!pathSegments || pathSegments.length === 0) return null
  if (pathSegments.some((segment) => !segment || segment === '.' || segment === '..')) return null

  try {
    return normalizeManagedUploadPath(`/uploads/${pathSegments.join('/')}`)
  } catch {
    return null
  }
}

async function handleRequest(pathSegments: string[] | undefined) {
  const managedPath = resolveManagedUploadPath(pathSegments)
  if (!managedPath) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const buffer = await readManagedUpload(managedPath)
    const body = new Uint8Array(buffer)
    return new NextResponse(body, {
      headers: {
        'Content-Type': guessContentTypeFromPath(managedPath),
        'Cache-Control': managedUploadCacheControl,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await context.params
  return handleRequest(params.path)
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const params = await context.params
  const response = await handleRequest(params.path)
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  })
}
