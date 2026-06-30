import { Prisma } from '@prisma/client';

export function formatPostUpdateError(error: unknown): { message: string; status: number } {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { message: 'Пост с таким URL (slug) уже существует', status: 409 };
    }
    if (error.code === 'P2025') {
      return { message: 'Пост не найден', status: 404 };
    }
    return { message: `Ошибка базы данных (${error.code})`, status: 500 };
  }

  if (error instanceof Error) {
    if (error.message.includes('brand scope')) {
      return { message: 'Пост не найден в выбранном бренде', status: 404 };
    }
    return { message: error.message, status: 500 };
  }

  return { message: 'Failed to update post', status: 500 };
}
