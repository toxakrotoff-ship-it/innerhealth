import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as productService from '@/services/product.service';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { getProjectRoot } from '@/lib/project-root';
import { normalizeProductPhoto } from '@/lib/product-photo-normalization';

type PhotoEntry = { url: string; blurDataURL?: string };

function parsePhotosJson(photos: unknown): PhotoEntry[] {
  if (!Array.isArray(photos)) return [];
  const result: PhotoEntry[] = [];
  for (const p of photos) {
    if (typeof p === 'string') {
      result.push({ url: p });
    } else if (p && typeof p === 'object' && 'url' in p && typeof (p as PhotoEntry).url === 'string') {
      result.push({ url: (p as PhotoEntry).url, blurDataURL: (p as PhotoEntry).blurDataURL });
    }
  }
  return result;
}

/** Block private/local URLs to prevent SSRF. */
function isUrlAllowed(url: URL): boolean {
  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return false;
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '::1') return false;
  // IPv4 private / loopback / link-local
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = hostname.match(ipv4);
  if (m) {
    const a = parseInt(m[1], 10); const b = parseInt(m[2], 10);
    if (a === 127) return false;
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
  }
  // IPv6 private / loopback
  if (hostname.startsWith('fd') || hostname.startsWith('fe80')) return false;
  return true;
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const formData = await request.formData();
    const url = formData.get('url') as string | null;
    const productId = formData.get('productId') as string | null;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const existingProduct = await productService.findProductById(productId);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const imageUrl = new URL(url);
    if (!isUrlAllowed(imageUrl)) {
      return NextResponse.json(
        { error: 'URL не разрешён (запрещены внутренние адреса)' },
        { status: 400 }
      );
    }
    
    // Получаем содержимое изображения
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL does not point to an image' },
        { status: 400 }
      );
    }

    // Создаем директорию для загрузки файлов, если её нет
    const productName = existingProduct.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ\-_]/g, '_');
    const uploadDir = path.join(getProjectRoot(), 'public', 'uploads', 'products', productName);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const arrayBuffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (originalBuffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Изображение не более 5 МБ' },
        { status: 400 }
      );
    }

    const webpFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
    const webpFilePath = path.join(uploadDir, webpFileName);
    const { webpBuffer, blurDataURL } = await normalizeProductPhoto(originalBuffer);
    await fsPromises.writeFile(webpFilePath, webpBuffer);

    const photoUrl = `/uploads/products/${productName}/${webpFileName}`;
    const blurDataURLValue = blurDataURL ?? undefined;

    const existingPhotos = parsePhotosJson(existingProduct.photos);
    const newEntry: PhotoEntry = { url: photoUrl, blurDataURL: blurDataURLValue };
    const updatedPhotos: PhotoEntry[] = [newEntry, ...existingPhotos];
    const photosJson = updatedPhotos.map((p) =>
      p.blurDataURL ? { url: p.url, blurDataURL: p.blurDataURL } : { url: p.url }
    );

    const updatedProduct = await productService.updateProduct(productId, {
      photo: photoUrl,
      photos: photosJson as unknown as object,
    });

    return NextResponse.json({
      message: 'Image downloaded, optimized and saved successfully',
      photo: photoUrl,
      blurDataURL: blurDataURLValue,
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    );
  }
}