import {
  validatePublicEmailDomain,
  type EmailDomainDnsResolver as EmailRealityDnsResolver,
} from './public-email-domain'

export type EmailRealityResult = { valid: true } | { valid: false; message: string }

export async function validateEmailReality(
  email: string,
  options?: {
    dns?: EmailRealityDnsResolver
    timeoutMs?: number
  }
): Promise<EmailRealityResult> {
  const result = await validatePublicEmailDomain(email, options)
  if (result.valid) return { valid: true }
  return { valid: false, message: result.userMessage }
}
