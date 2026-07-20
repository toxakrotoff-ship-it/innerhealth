import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import { buildManagedUploadPath, uploadManagedUpload } from '@/lib/media-storage';

const ALLOWED_FOLDERS = ['products', 'posts', 'content', 'categories', 'popup'] as const;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'posts';

    if (!ALLOWED_FOLDERS.includes(folder as (typeof ALLOWED_FOLDERS)[number])) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл не более 5 МБ' }, { status: 400 });
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Допустимы только изображения: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }
    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'jpg';

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = buildManagedUploadPath(folder, fileName);

    await uploadManagedUpload({
      filePath: url,
      buffer,
      contentType: file.type,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as NodeJS.ErrnoException).code === 'string'
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === 'EACCES' || code === 'EPERM') {
      return NextResponse.json(
        {
          error: 'Нет прав на запись в хранилище загрузок.',
        },
        { status: 500 }
      );
    }
    if (code === 'ENOSPC') {
      return NextResponse.json({ error: 'Недостаточно места на диске для загрузки.' }, { status: 507 });
    }
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
