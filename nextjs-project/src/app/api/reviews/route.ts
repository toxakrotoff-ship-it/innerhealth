import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/project-root';
import * as reviewService from '@/services/review.service';
import { notifyTelegramNewReview } from '@/lib/telegram-notify';
import { notifyMaxNewReview } from '@/lib/max-notify';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';
import { resolveDbBrand } from '@/lib/brand/brand-db';

const REVIEW_RATE_LIMIT = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const AUTHOR_NAME_MIN = 2;
const AUTHOR_NAME_MAX = 120;
const SOCIAL_LINK_MAX = 500;
const TEXT_MIN = 10;
const TEXT_MAX = 3000;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const UPLOAD_FOLDER = 'reviews';

function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

function checkRateLimit(clientId: string): { success: boolean } {
  const now = Date.now();
  const windowMs = 60_000;
  let entry = rateLimitMap.get(clientId);
  if (!entry) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }
  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(clientId, entry);
    return { success: true };
  }
  entry.count += 1;
  if (entry.count > REVIEW_RATE_LIMIT) return { success: false };
  return { success: true };
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GET /api/reviews — список одобренных отзывов для карусели (по убыванию даты).
 */
export async function GET(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request);
    const reviews = await reviewService.getApprovedReviews(brandId);
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Reviews GET error:', error);
    return NextResponse.json(
      { error: 'Не удалось загрузить отзывы.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews — отправка отзыва (multipart: authorName, socialLink, text, photo?).
 */
export async function POST(request: Request) {
  const brandId = resolveBrandOrDefaultFromRequest(request);
  const clientId = getClientId(request);
  if (!checkRateLimit(clientId).success) {
    return NextResponse.json(
      { error: 'Слишком много отправок. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const authorName = (formData.get('authorName') as string | null)?.trim() ?? '';
    const socialLink = (formData.get('socialLink') as string | null)?.trim().slice(0, SOCIAL_LINK_MAX) ?? '';
    const text = (formData.get('text') as string | null)?.trim() ?? '';
    const file = formData.get('photo') as File | null;

    if (authorName.length < AUTHOR_NAME_MIN || authorName.length > AUTHOR_NAME_MAX) {
      return NextResponse.json(
        { error: `Имя: от ${AUTHOR_NAME_MIN} до ${AUTHOR_NAME_MAX} символов.` },
        { status: 400 }
      );
    }
    if (socialLink && !isValidUrl(socialLink)) {
      return NextResponse.json(
        { error: 'Укажите корректную ссылку на профиль в соцсети.' },
        { status: 400 }
      );
    }
    if (text.length < TEXT_MIN || text.length > TEXT_MAX) {
      return NextResponse.json(
        { error: `Текст отзыва: от ${TEXT_MIN} до ${TEXT_MAX} символов.` },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;
    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Файл не более 5 МБ.' },
          { status: 400 }
        );
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Допустимы только изображения: JPG, PNG, GIF, WebP.' },
          { status: 400 }
        );
      }
      const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
      const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg';
      const uploadDir = path.join(getProjectRoot(), 'public', 'uploads', UPLOAD_FOLDER);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      imageUrl = `/uploads/${UPLOAD_FOLDER}/${fileName}`;
    }

    const review = await reviewService.createReview({
      brand: resolveDbBrand(brandId),
      authorName,
      socialLink: socialLink || undefined,
      text,
      imageUrl: imageUrl ?? undefined,
      status: 'PENDING',
    });

    notifyTelegramNewReview({
      reviewId: review.id,
      authorName,
      text,
      brandId,
    });
    void notifyMaxNewReview({
      reviewId: review.id,
      authorName,
      text,
      brandId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reviews POST error:', error);
    return NextResponse.json(
      { error: 'Не удалось отправить отзыв. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
