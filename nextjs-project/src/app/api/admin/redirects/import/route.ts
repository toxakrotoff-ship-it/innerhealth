import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdminSession } from '@/lib/require-admin';
import { importRedirectsFromCsv } from '@/services/redirect.service';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать тело запроса' }, { status: 400 });
  }

  const file = formData.get('csv') ?? formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Приложите файл CSV (поле csv или file)' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Размер файла не более ${MAX_FILE_SIZE / 1024 / 1024} MB` },
      { status: 400 }
    );
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать файл' }, { status: 400 });
  }

  try {
    const result = await importRedirectsFromCsv(text);
    revalidateTag('redirects', 'max');
    return NextResponse.json({
      created: result.created,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (e) {
    console.error('POST /api/admin/redirects/import:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка импорта' },
      { status: 500 }
    );
  }
}
