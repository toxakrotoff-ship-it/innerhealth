import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as productService from '@/services/product.service';
import { lookup } from 'node:dns/promises';
import fs from 'fs';
import fsPromises from 'fs/promises';
import net from 'node:net';
import path from 'path';
import { getProjectRoot } from '@/lib/project-root';
import { normalizeProductPhoto } from '@/lib/product-photo-normalization';

type PhotoEntry = {
  url: string
  blurDataURL?: string
  transform?: {
    fitMode: 'contain' | 'cover'
    x: number
    y: number
    zoom: number
  }
};

function parsePhotosJson(photos: unknown): PhotoEntry[] {
  if (!Array.isArray(photos)) return [];
  const result: PhotoEntry[] = [];
  for (const p of photos) {
    if (typeof p === 'string') {
      result.push({ url: p });
    } else if (p && typeof p === 'object' && 'url' in p && typeof (p as PhotoEntry).url === 'string') {
      result.push({ url: (p as PhotoEntry).url, blurDataURL: (p as PhotoEntry).blurDataURL, transform: (p as PhotoEntry).transform });
    }
  }
  return result;
}

/** Block non-http(s), localhost and direct private addresses to reduce SSRF risk. */
function isUrlAllowed(url: URL): boolean {
  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') return false;
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '::1') return false;
  const ipVersion = net.isIP(hostname);
  if (ipVersion > 0 && isPrivateAddress(hostname)) return false;
  return true;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function normalizeIpv6(address: string): string {
  return address.toLowerCase().replace(/^\[|\]$/g, '');
}

function isPrivateIpv6(address: string): boolean {
  const normalized = normalizeIpv6(address);
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = normalized.slice('::ffff:'.length);
    return isPrivateIpv4(mappedIpv4);
  }
  return false;
}

function isPrivateAddress(address: string): boolean {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) return isPrivateIpv4(address);
  if (ipVersion === 6) return isPrivateIpv6(address);
  return true;
}

async function assertPublicDnsTarget(url: URL): Promise<void> {
  const hostname = url.hostname;
  const ipVersion = net.isIP(hostname);
  if (ipVersion > 0) {
    if (isPrivateAddress(hostname)) {
      throw new Error('Private address is not allowed');
    }
    return;
  }

  const results = await lookup(hostname, { all: true, verbatim: true });
  if (results.length === 0) {
    throw new Error('DNS resolution failed');
  }

  for (const result of results) {
    if (isPrivateAddress(result.address)) {
      throw new Error('Resolved address is not allowed');
    }
  }
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

    await assertPublicDnsTarget(imageUrl);
    
    // Do not follow redirects to avoid redirecting into internal networks.
    const response = await fetch(imageUrl, { redirect: 'error' });
    
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
    const photosJson = updatedPhotos.map((p) => ({
      url: p.url,
      ...(p.blurDataURL ? { blurDataURL: p.blurDataURL } : {}),
      ...(p.transform ? { transform: p.transform } : {}),
    }));

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
