import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as productService from '@/services/product.service';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/project-root';
import { normalizeProductPhoto } from '@/lib/product-photo-normalization';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

type PhotoEntry = { url: string; blurDataURL?: string };

function parsePhotosJson(photos: unknown): PhotoEntry[] {
  if (!Array.isArray(photos)) return [];
  const result: PhotoEntry[] = [];
  for (const p of photos) {
    if (typeof p === 'string') result.push({ url: p });
    else if (p && typeof p === 'object' && 'url' in p && typeof (p as PhotoEntry).url === 'string') {
      result.push({ url: (p as PhotoEntry).url, blurDataURL: (p as PhotoEntry).blurDataURL });
    }
  }
  return result;
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Файл не выбран' },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Допустимы только изображения: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(getProjectRoot(), 'public', 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { webpBuffer, blurDataURL } = await normalizeProductPhoto(buffer);

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.webp`;
    const filePath = path.join(uploadDir, fileName);
    await fs.promises.writeFile(filePath, webpBuffer);

    const photoUrl = `/uploads/products/${fileName}`;
    const blurDataURLValue = blurDataURL ?? undefined;

    if (productId) {
      const existingProduct = await productService.findProductById(productId);
      if (existingProduct) {
        const existingPhotos = parsePhotosJson(existingProduct.photos);
        const newEntry: PhotoEntry = { url: photoUrl, blurDataURL: blurDataURLValue };
        const updatedPhotos: PhotoEntry[] = [newEntry, ...existingPhotos];
        const photosJson = updatedPhotos.map((p) =>
          p.blurDataURL ? { url: p.url, blurDataURL: p.blurDataURL } : { url: p.url }
        );
        await productService.updateProduct(productId, {
          photo: photoUrl,
          photos: photosJson as unknown as object,
        });
      }
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      photo: photoUrl,
      blurDataURL: blurDataURLValue,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
