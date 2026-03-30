/**
 * MAX GET /subscriptions returns `{ subscriptions: Subscription[] }` (see dev.max.ru docs),
 * while admin UI expects `url` and `update_types` on the root object.
 */
export function normalizeMaxSubscriptionsPayload(parsed: unknown): Record<string, unknown> {
  const base =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  if (typeof base.url === 'string' || Array.isArray(base.update_types)) {
    return base;
  }

  const subs = base.subscriptions;
  if (!Array.isArray(subs) || subs.length === 0) return base;

  const first = subs[0];
  if (first === null || typeof first !== 'object' || Array.isArray(first)) return base;

  const s = first as Record<string, unknown>;
  const url =
    typeof s.url === 'string'
      ? s.url
      : typeof s.webhook_url === 'string'
        ? s.webhook_url
        : undefined;
  const rawTypes = s.update_types ?? s.updateTypes;
  const update_types = Array.isArray(rawTypes) ? rawTypes.map((item) => String(item)) : undefined;

  return {
    ...base,
    ...(url ? { url } : {}),
    ...(update_types !== undefined ? { update_types } : {}),
  };
}
