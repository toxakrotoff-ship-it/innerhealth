import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Получаем все промокоды с информацией о количестве использований
    const promoCodes = await prisma.promoCode.findMany({
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Преобразуем данные для ответа
    const formattedCodes = promoCodes.map(code => ({
      id: code.id,
      code: code.code,
      discountType: code.discountType,
      discountValue: code.discountValue,
      isActive: code.isActive,
      usageLimit: code.usageLimit,
      usedCount: code._count.orders,
      validFrom: code.validFrom,
      validTo: code.validTo,
      createdAt: code.createdAt.toISOString(),
    }));
    
    return NextResponse.json(formattedCodes);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo codes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const data = await request.json();
    
    // Валидация данных
    if (!data.code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }
    
    if (!data.discountType || !['percentage', 'fixed'].includes(data.discountType)) {
      return NextResponse.json(
        { error: 'Invalid discount type' },
        { status: 400 }
      );
    }
    
    if (data.discountValue === undefined || data.discountValue < 0) {
      return NextResponse.json(
        { error: 'Invalid discount value' },
        { status: 400 }
      );
    }
    
    // Создаем промокод
    const promoCode = await prisma.promoCode.create({
      data: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        isActive: data.isActive !== undefined ? data.isActive : true,
        usageLimit: data.usageLimit,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
      }
    });
    
    return NextResponse.json(promoCode);
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const data = await request.json();
    
    // Валидация данных
    if (!data.id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли промокод
    const existingCode = await prisma.promoCode.findUnique({
      where: { id: data.id }
    });
    
    if (!existingCode) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }
    
    // Обновляем промокод
    const promoCode = await prisma.promoCode.update({
      where: { id: data.id },
      data: {
        code: data.code || existingCode.code,
        discountType: data.discountType || existingCode.discountType,
        discountValue: data.discountValue !== undefined ? data.discountValue : existingCode.discountValue,
        isActive: data.isActive !== undefined ? data.isActive : existingCode.isActive,
        usageLimit: data.usageLimit !== undefined ? data.usageLimit : existingCode.usageLimit,
        validFrom: data.validFrom ? new Date(data.validFrom) : existingCode.validFrom,
        validTo: data.validTo ? new Date(data.validTo) : existingCode.validTo,
      }
    });
    
    return NextResponse.json(promoCode);
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json(
      { error: 'Failed to update promo code' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  // Проверяем аутентификацию на сервере
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли промокод
    const existingCode = await prisma.promoCode.findUnique({
      where: { id }
    });
    
    if (!existingCode) {
      return NextResponse.json(
        { error: 'Promo code not found' },
        { status: 404 }
      );
    }
    
    // Удаляем промокод
    await prisma.promoCode.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json(
      { error: 'Failed to delete promo code' },
      { status: 500 }
    );
  }
}