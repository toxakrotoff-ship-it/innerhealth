import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const ALLOWED_FOLDERS = ['products', 'posts'] as const;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${folder}/${fileName}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
