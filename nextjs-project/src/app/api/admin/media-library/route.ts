import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { listManagedUploads } from '@/lib/media-storage'

const ALLOWED_FOLDERS = new Set([
  'products',
  'posts',
  'content',
  'categories',
  'popup',
  'reviews',
  'documents',
  'tilda',
])

function parseFolders(raw: string | null): string[] {
  return (raw ?? '')
    .split(',')
    .map((folder) => folder.trim())
    .filter((folder) => folder && ALLOWED_FOLDERS.has(folder))
}

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') === 'document' ? 'document' : 'image'
    const folders = parseFolders(searchParams.get('folders'))
    const q = searchParams.get('q')?.trim().toLowerCase() ?? ''
    const limitParam = Number.parseInt(searchParams.get('limit') ?? '200', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200

    if (folders.length === 0) {
      return NextResponse.json({ error: 'Укажите хотя бы одну папку' }, { status: 400 })
    }

    const items = await listManagedUploads({ folders, kind, limit: limit * 2 })
    const filtered = q
      ? items.filter((item) => {
          const haystack = `${item.name} ${item.url} ${item.folder}`.toLowerCase()
          return haystack.includes(q)
        })
      : items

    return NextResponse.json(filtered.slice(0, limit))
  } catch (error) {
    console.error('media library list', error)
    return NextResponse.json({ error: 'Не удалось загрузить библиотеку медиа' }, { status: 500 })
  }
}
