import { NextResponse } from 'next/server'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { buildManagedUploadPath, uploadManagedUpload } from '@/lib/media-storage'
import {
  buildStoredProductDocumentFileName,
  detectProductDocumentMime,
  PRODUCT_DOCUMENT_MAX_FILE_SIZE,
  PRODUCT_DOCUMENT_UPLOAD_FOLDER,
} from '@/lib/product-document-files'
import { requireAdminSession } from '@/lib/require-admin'

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const brandId = resolveAdminBrandFromRequest(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 })
    }

    if (file.size > PRODUCT_DOCUMENT_MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл не должен превышать 20 МБ' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedMime = detectProductDocumentMime(buffer)

    if (!detectedMime) {
      return NextResponse.json(
        { error: 'Допустимы только PDF, JPG, PNG и WebP' },
        { status: 400 }
      )
    }

    const fileName = buildStoredProductDocumentFileName({
      brand: brandId,
      originalName: file.name,
      mimeType: detectedMime,
    })

    const url = buildManagedUploadPath(PRODUCT_DOCUMENT_UPLOAD_FOLDER, fileName)
    await uploadManagedUpload({
      filePath: url,
      buffer,
      contentType: detectedMime,
    })

    return NextResponse.json({
      url,
      fileName,
      originalName: file.name,
      mimeType: detectedMime,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('product document upload', error)
    return NextResponse.json({ error: 'Не удалось загрузить документ' }, { status: 500 })
  }
}
