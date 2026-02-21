import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const photoUrl = `/uploads/products/${fileName}`;

    if (productId) {
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId }
      });
      if (existingProduct) {
        await prisma.product.update({
          where: { id: productId },
          data: { photo: photoUrl }
        });
      }
    }

    return NextResponse.json({
      message: 'File uploaded successfully',
      photo: photoUrl
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}