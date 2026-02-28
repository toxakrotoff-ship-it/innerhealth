import { isDisposableDomain } from "./disposable-email-domains";

export function normalizeEmailAddress(input: string): string {
  const trimmed = input.trim();
  const at = trimmed.indexOf("@");
  if (at === -1) return trimmed.toLowerCase();
  const local = trimmed.slice(0, at).toLowerCase();
  const domain = trimmed.slice(at + 1).toLowerCase();
  return `${local}@${domain}`;
}

export function extractEmailDomain(email: string): string {
  const normalized = normalizeEmailAddress(email);
  const at = normalized.indexOf("@");
  if (at === -1) return "";
  return normalized.slice(at + 1);
}

export type EmailRiskVerdict = "allow" | "block";

export function getEmailRiskVerdict(email: string): EmailRiskVerdict {
  const domain = extractEmailDomain(email);
  if (!domain) return "allow";
  return isDisposableDomain(domain) ? "block" : "allow";
}
