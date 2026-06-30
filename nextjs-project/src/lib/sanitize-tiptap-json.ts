import type { Prisma } from '@prisma/client';

/** Ensures TipTap JSON is plain serializable data safe for Prisma `Json` columns. */
export function sanitizeTipTapJsonForStorage(value: unknown): Prisma.InputJsonValue {
  if (value == null) {
    return { type: 'doc', content: [] };
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return { type: 'doc', content: [] };
  }
}
