import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import {
  buildStoredProductDocumentFileName,
  detectProductDocumentMime,
  PRODUCT_DOCUMENT_MAX_FILE_SIZE,
  PRODUCT_DOCUMENT_UPLOAD_FOLDER,
} from '@/lib/product-document-files'
import { getProjectRoot } from '@/lib/project-root'
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

    const uploadDir = path.join(getProjectRoot(), 'public', 'uploads', PRODUCT_DOCUMENT_UPLOAD_FOLDER)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    await fs.promises.writeFile(filePath, buffer)

    return NextResponse.json({
      url: `/uploads/${PRODUCT_DOCUMENT_UPLOAD_FOLDER}/${fileName}`,
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
