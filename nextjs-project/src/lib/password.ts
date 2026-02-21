import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password for secure storage.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a stored hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Check if a stored value looks like a bcrypt hash (for migration/backward compat).
 */
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}
