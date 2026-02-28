/** Code points to strip: C0 control, DEL, and common invisible (zero-width, BOM). */
function isControlOrInvisible(code: number): boolean {
  return (
    (code >= 0x00 && code <= 0x1f) ||
    code === 0x7f ||
    (code >= 0x200b && code <= 0x200d) ||
    code === 0x2060 ||
    code === 0xfeff
  );
}

/**
 * Removes control and invisible characters from a string.
 */
export function stripControlAndInvisibleChars(value: string): string {
  return Array.from(value)
    .filter((c) => !isControlOrInvisible(c.codePointAt(0)!))
    .join("");
}

/**
 * Sanitizes a human name: strip control/invisible, trim, collapse repeated spaces to one.
 */
export function sanitizeHumanName(value: string): string {
  const stripped = stripControlAndInvisibleChars(value);
  return stripped.trim().replace(/\s+/g, " ");
}

/** Allowed phone characters: + digits space - ( ) */
const PHONE_ALLOWED = /[^\d+\s\-()]/g;

/**
 * Keeps only allowed phone characters: +, digits, space, -, (, ), and collapses repeated spaces.
 */
export function sanitizePhone(value: string): string {
  const allowed = value.replace(PHONE_ALLOWED, "");
  return allowed.replace(/\s+/g, " ");
}
