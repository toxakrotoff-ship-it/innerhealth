/**
 * Lowercase denylist of known disposable/temporary email domains.
 * Used for email risk verdict at registration and verification boundaries.
 */
const DISPOSABLE_DOMAINS = new Set<string>([
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "maildrop.cc",
  "mailinator.com",
  "tempmail.com",
  "tempspam.com",
  "temp-mail.org",
  "temp-mail.io",
]);

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}
