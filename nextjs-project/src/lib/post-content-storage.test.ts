import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { formatPostUpdateError } from '@/lib/post-update-error';
import { sanitizeTipTapJsonForStorage } from '@/lib/sanitize-tiptap-json';

describe('sanitizeTipTapJsonForStorage', () => {
  it('returns empty doc for nullish values', () => {
    expect(sanitizeTipTapJsonForStorage(null)).toEqual({ type: 'doc', content: [] });
  });

  it('strips unsupported values and keeps heading blocks', () => {
    const input = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'before' }] },
        {
          type: 'heading',
          attrs: { level: 2, extra: undefined },
          content: [{ type: 'text', text: 'title', marks: [{ type: 'bold' }] }],
        },
      ],
      meta: undefined,
    };

    expect(sanitizeTipTapJsonForStorage(input)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'before' }] },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'title', marks: [{ type: 'bold' }] }],
        },
      ],
    });
  });
});

describe('formatPostUpdateError', () => {
  it('maps slug conflict to readable message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(formatPostUpdateError(error)).toEqual({
      message: 'Пост с таким URL (slug) уже существует',
      status: 409,
    });
  });
});
