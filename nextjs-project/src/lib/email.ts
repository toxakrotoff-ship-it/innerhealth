import nodemailer from 'nodemailer'

const DEFAULT_PUBLIC_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://innerhaealth.inetrnet.pp.ru'

/**
 * Delay between order emails (admin → customer) to reduce burst pattern and spam/rate-limit risk.
 * Practice: 5–15 s is usually enough for 1–2 mails; for higher volume consider 1–5 min via env.
 * Env: EMAIL_SEND_DELAY_MS_MIN, EMAIL_SEND_DELAY_MS_MAX (ms; max cap 25 min).
 */
const DEFAULT_EMAIL_DELAY_MS_MIN = 5_000
const DEFAULT_EMAIL_DELAY_MS_MAX = 15_000
const EMAIL_DELAY_CAP_MS = 25 * 60 * 1_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Random delay (ms) between sending admin notification and customer confirmation.
 * Reduces burst pattern and helps avoid spam/rate-limit triggers.
 * Use env EMAIL_SEND_DELAY_MS_MIN / EMAIL_SEND_DELAY_MS_MAX (values in ms; max cap 25 min).
 */
export function getEmailSendDelayMs(): number {
  const minRaw = Number(process.env.EMAIL_SEND_DELAY_MS_MIN)
  const maxRaw = Number(process.env.EMAIL_SEND_DELAY_MS_MAX)
  const min = Number.isNaN(minRaw) || minRaw < 0 ? DEFAULT_EMAIL_DELAY_MS_MIN : Math.min(minRaw, EMAIL_DELAY_CAP_MS)
  const max = Number.isNaN(maxRaw) || maxRaw < 0 ? DEFAULT_EMAIL_DELAY_MS_MAX : Math.min(maxRaw, EMAIL_DELAY_CAP_MS)
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

function isLocalhostUrl(url: string): boolean {
  if (!url || !url.trim()) return true
  try {
    const u = new URL(url.replace(/\/$/, ''))
    return /localhost|127\.0\.0\.1/i.test(u.hostname)
  } catch {
    return true
  }
}

/**
 * Base URL for links in emails. Never returns localhost — env/request localhost values are ignored.
 * Order: APP_URL → NEXTAUTH_URL → NEXT_PUBLIC_SITE_URL → request origin (if not localhost) → DEFAULT_PUBLIC_URL.
 */
export function getBaseUrlForEmails(request?: Request): string {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  let baseUrl = candidates.find((u) => !isLocalhostUrl(u)) ?? ''
  if (!baseUrl && request?.url) {
    try {
      const origin = new URL(request.url).origin
      if (origin && !isLocalhostUrl(origin)) {
        baseUrl = origin
      }
    } catch {
      // ignore
    }
  }
  if (!baseUrl || isLocalhostUrl(baseUrl)) {
    baseUrl = DEFAULT_PUBLIC_URL
  }
  return baseUrl.replace(/\/$/, '')
}

/**
 * Send password reset email. No-op if SMTP is not configured.
 * Transporter is created per send so env (port/secure) is always current after restart.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  expiresInMinutes: number
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured (SMTP_HOST missing); password reset email not sent to', to)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  try {
    console.log('[email] Sending password reset to', to)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to,
      subject: 'Сброс пароля — админ-панель',
      text: `Перейдите по ссылке для сброса пароля:\n\n${resetLink}\n\nСсылка действительна ${expiresInMinutes} минут.`,
      html: `
        <p>Вы запросили сброс пароля.</p>
        <p><a href="${resetLink}">Сбросить пароль</a></p>
        <p>Ссылка действительна ${expiresInMinutes} минут.</p>
        <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
      `.trim(),
    })
    console.log('[email] Password reset email sent to', to)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send password reset error:', message)
    return { ok: false, error: message }
  }
}

const SUPPORT_FROM = process.env.SUPPORT_EMAIL_FROM ?? 'support@innerhealth.ru'
/** Reply-To for all transactional emails; defaults to same as From. */
const REPLY_TO = process.env.SUPPORT_EMAIL_REPLY_TO ?? SUPPORT_FROM

export async function sendEmailVerificationLinkEmail(
  to: string,
  verificationLink: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; verification email not sent to', to)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }

  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })

  try {
    console.log('[email] Sending verification link to', to)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to,
      subject: 'Подтверждение email — Inner Health',
      text: `Подтвердите ваш email по ссылке:\n\n${verificationLink}\n\nЕсли вы не создавали аккаунт, проигнорируйте письмо.`,
      html: `<p>Подтвердите ваш email по ссылке:</p><p><a href="${verificationLink}">${verificationLink}</a></p><p>Если вы не создавали аккаунт, проигнорируйте письмо.</p><p>— Команда Inner Health</p>`.trim(),
    })
    console.log('[email] Verification email sent to', to)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send verification link error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send initial password link (for new user registration completion).
 * Text: «Для завершения регистрации пройдите по: {link}»
 */
export async function sendInitialPasswordLinkEmail(
  to: string,
  link: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; initial password link not sent to', to)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  try {
    console.log('[email] Sending initial password link to', to)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to,
      subject: 'Завершение регистрации — Inner Health',
      text: `Для завершения регистрации пройдите по ссылке:\n\n${link}`,
      html: `<p>Для завершения регистрации пройдите по ссылке:</p><p><a href="${link}">${link}</a></p><p>— Команда Inner Health</p>`.trim(),
    })
    console.log('[email] Initial password link sent to', to)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send initial password link error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send one-time 6-digit code for initial password step.
 * Text: «Ваш одноразовый код: {code}»
 */
export async function sendInitialPasswordCodeEmail(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; initial password code not sent to', to)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  try {
    console.log('[email] Sending initial password code to', to)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to,
      subject: 'Код для завершения регистрации — Inner Health',
      text: `Ваш одноразовый код: ${code}`,
      html: `<p>Ваш одноразовый код: <strong>${code}</strong></p><p>— Команда Inner Health</p>`.trim(),
    })
    console.log('[email] Initial password code sent to', to)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send initial password code error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send 6-digit code for 2FA login (email method).
 * Text: «Ваш код для входа: {code}. Действует 5 минут.»
 */
export async function send2FACodeEmail(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; 2FA code not sent to', to)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  try {
    console.log('[email] Sending 2FA code to', to)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to,
      subject: 'Код для входа — Inner Health',
      text: `Ваш код для входа: ${code}. Действует 5 минут.`,
      html: `<p>Ваш код для входа: <strong>${code}</strong></p><p>Действует 5 минут.</p><p>— Команда Inner Health</p>`.trim(),
    })
    console.log('[email] 2FA code sent to', to)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send 2FA code error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send new user credentials (login + generated password) from support@innerhealth.ru.
 * No-op if SMTP is not configured.
 */
export async function sendNewUserCredentials(
  to: string,
  loginEmail: string,
  plainPassword: string,
  name: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; credentials email not sent to', to)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  const greeting = name ? `Здравствуйте, ${name}.` : 'Здравствуйте.'
  try {
    console.log('[email] Sending new user credentials to', to)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to,
      subject: 'Доступ в админ-панель Inner Health',
      text: `${greeting}\n\nВам создан аккаунт в админ-панели.\n\nЛогин: ${loginEmail}\nПароль: ${plainPassword}\n\nРекомендуем сменить пароль после первого входа.\n\n— Команда Inner Health`,
      html: `
        <p>${greeting}</p>
        <p>Вам создан аккаунт в админ-панели.</p>
        <p><strong>Логин:</strong> ${loginEmail}</p>
        <p><strong>Пароль:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${plainPassword}</code></p>
        <p>Рекомендуем сменить пароль после первого входа.</p>
        <p>— Команда Inner Health</p>
      `.trim(),
    })
    console.log('[email] New user credentials email sent to', to)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send new user credentials error:', message)
    return { ok: false, error: message }
  }
}

export interface NewOrderEmailPayload {
  orderId: string
  total: number
  items: Array<{ title: string; quantity: number; price: number }>
  shipping: {
    fullName: string
    phone: string
    email: string
    address: string
    city: string
    zipCode: string
    country: string
  }
  promoCode?: string | null
  cdekTrackNumber?: string | null
}

export interface PaidOrderEmailPayload extends NewOrderEmailPayload {
  /** Трек-номер СДЭК (если уже сформирован) */
  cdekTrackNumber?: string | null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatRub(value: number): string {
  return `${value.toFixed(2)} ₽`
}

function getCdekTrackingUrl(trackNumber: string): string {
  return `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(trackNumber)}`
}

/**
 * Send new order notification from support@innerhealth.ru to admin mailbox(s).
 * No-op if SMTP is not configured or toEmails is empty.
 */
export async function sendNewOrderNotification(
  toEmails: string[],
  payload: NewOrderEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const unique = Array.from(new Set(toEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)))
  if (unique.length === 0) return { ok: true }
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; new order notification not sent')
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  const { orderId, total, items, shipping, promoCode, cdekTrackNumber } = payload
  const itemsLines = items.map(
    (i) => `${i.title} — ${i.quantity} × ${formatRub(i.price)} = ${formatRub(i.quantity * i.price)}`
  )
  const itemsHtml = items
    .map((i) => {
      const lineTotal = i.quantity * i.price
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:1.45;color:#111827;">
            <div style="font-weight:600;">${escapeHtml(i.title)}</div>
            <div style="margin-top:4px;color:#6b7280;">${i.quantity} шт. × ${formatRub(i.price)}</div>
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-weight:700;color:#111827;white-space:nowrap;">
            ${formatRub(lineTotal)}
          </td>
        </tr>
      `.trim()
    })
    .join('')
  const cityLine = [shipping.city, shipping.zipCode, shipping.country].filter(Boolean).join(', ')
  const trackLine = cdekTrackNumber?.trim() ? `\nТрек-номер СДЭК: ${cdekTrackNumber.trim()}\n` : ''
  const text =
    `Новый заказ на сайте\n\n` +
    `ID заказа: ${orderId}\n` +
    `Сумма: ${formatRub(total)}\n\n` +
    `Состав:\n${itemsLines.join('\n')}\n\n` +
    (promoCode ? `Промокод: ${promoCode}\n\n` : '') +
    trackLine +
    `Доставка:\n` +
    `ФИО: ${shipping.fullName}\n` +
    `Телефон: ${shipping.phone}\n` +
    `Email: ${shipping.email}\n` +
    `Адрес: ${shipping.address}\n` +
    `Город: ${cityLine}\n`
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Новый заказ — Inner Health</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f1eb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Новый заказ ${escapeHtml(orderId)} на сумму ${formatRub(total)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#f7f4ee 0%,#f3f1eb 100%);">
    <tr>
      <td style="padding:24px 12px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background-color:#fffdf9;border:1px solid #ebe6dc;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 22px;background:linear-gradient(135deg,#16302b 0%,#27544c 100%);">
              <div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#d8e9e3;">Inner Health</div>
              <h1 style="margin:14px 0 8px;font-family:Arial,'Segoe UI',sans-serif;font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">Новый заказ</h1>
              <p style="margin:0;font-size:15px;line-height:1.5;color:#d9ebe4;">Заказ оформлен на сайте и ожидает обработки.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:0 8px 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4efe4;border-radius:18px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7b6d57;">ID заказа</div>
                          <div style="margin-top:8px;font-size:24px;line-height:1.2;font-weight:800;color:#1f2937;word-break:break-word;">${escapeHtml(orderId)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 8px 12px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eef6f2;border-radius:18px;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4d7a6d;">Сумма заказа</div>
                          <div style="margin-top:8px;font-size:28px;line-height:1.1;font-weight:800;color:#16302b;">${formatRub(total)}</div>
                          ${promoCode ? `<div style="margin-top:10px;font-size:13px;line-height:1.4;color:#45665d;">Промокод: <strong>${escapeHtml(promoCode)}</strong></div>` : ''}
                          ${cdekTrackNumber?.trim() ? `<div style="margin-top:10px;font-size:13px;line-height:1.4;color:#45665d;">Трек-номер СДЭК: <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(cdekTrackNumber.trim())}</strong></div>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <h2 style="margin:0 0 14px;font-family:Arial,'Segoe UI',sans-serif;font-size:20px;line-height:1.2;font-weight:800;color:#111827;">Состав заказа</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;background-color:#ffffff;">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <thead>
                        <tr style="background-color:#faf7f1;">
                          <th style="padding:12px 16px;text-align:left;font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">Позиция</th>
                          <th style="padding:12px 16px;text-align:right;font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                        <tr style="background-color:#fcfcfb;">
                          <td style="padding:16px;border-bottom:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">Итого</td>
                          <td style="padding:16px;border-bottom:none;text-align:right;font-size:18px;font-weight:800;color:#111827;white-space:nowrap;">${formatRub(total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 32px;">
              <h2 style="margin:0 0 14px;font-family:Arial,'Segoe UI',sans-serif;font-size:20px;line-height:1.2;font-weight:800;color:#111827;">Доставка и контакты</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fafaf9;border:1px solid #ebe6dc;border-radius:18px;">
                <tr>
                  <td style="padding:18px 18px 8px;font-size:14px;line-height:1.55;color:#374151;">
                    <p style="margin:0 0 10px;"><strong style="color:#111827;">ФИО:</strong> ${escapeHtml(shipping.fullName)}</p>
                    <p style="margin:0 0 10px;"><strong style="color:#111827;">Телефон:</strong> <a href="tel:${escapeHtml(shipping.phone)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(shipping.phone)}</a></p>
                    <p style="margin:0 0 10px;"><strong style="color:#111827;">Email:</strong> <a href="mailto:${escapeHtml(shipping.email)}" style="color:#0f766e;text-decoration:none;">${escapeHtml(shipping.email)}</a></p>
                    <p style="margin:0 0 10px;"><strong style="color:#111827;">Адрес:</strong> ${escapeHtml(shipping.address)}</p>
                    <p style="margin:0;"><strong style="color:#111827;">Город:</strong> ${escapeHtml(cityLine)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
  try {
    console.log('[email] Sending new order notification to', unique.join(', '))
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to: unique.join(', '),
      subject: `Новый заказ ${orderId} — Inner Health`,
      text,
      html,
    })
    console.log('[email] New order notification sent')
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send new order notification error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send order confirmation to the customer (support@innerhealth.ru).
 * Subject: Уведомления. Body: приветствие, благодарность, состав заказа, авто-подпись.
 * No-op if SMTP is not configured.
 */
export async function sendCustomerOrderConfirmation(
  to: string,
  username: string,
  payload: NewOrderEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const trimmedTo = to.trim().toLowerCase()
  if (!trimmedTo) return { ok: true }
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; customer order confirmation not sent to', trimmedTo)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  const { total, items, cdekTrackNumber } = payload
  const orderSummary = items
    .map(
      (i) =>
        `${i.title} — ${i.quantity} × ${formatRub(i.price)} = ${formatRub(i.quantity * i.price)}`
    )
    .join('\n')
  const orderSummaryHtml = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(i.title)}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatRub(i.quantity * i.price)}</td></tr>`
    )
    .join('')
  const trackLine = cdekTrackNumber?.trim()
    ? `\n\nТрек-номер СДЭК: ${cdekTrackNumber.trim()}`
    : ''
  const text =
    `Вас приветствует Inner Health!\n\n${username}, благодарим за заказ.\n\nСостав заказа:\n${orderSummary}\n\nИтого: ${formatRub(total)}${trackLine}\n\n* Данное письмо создано автоматически, отвечать на него не требуется.`
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Уведомление о заказе</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Inner Health</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Уведомление о заказе</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">Вас приветствует Inner Health!</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#374151;"><strong>${escapeHtml(username)}</strong>, благодарим за заказ.</p>
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Состав заказа:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;color:#4b5563;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;">Товар</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;">Кол-во</th>
                    <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderSummaryHtml}
                </tbody>
              </table>
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#0f766e;">Итого: ${formatRub(total)}</p>
              ${cdekTrackNumber?.trim() ? `<p style="margin:0 0 24px;font-size:14px;color:#374151;"><strong>Трек-номер СДЭК:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(cdekTrackNumber.trim())}</span></p>` : '<div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>'}
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">* Данное письмо создано автоматически, отвечать на него не требуется.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
  try {
    console.log('[email] Sending customer order confirmation to', trimmedTo)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to: trimmedTo,
      subject: 'Уведомления',
      text,
      html,
    })
    console.log('[email] Customer order confirmation sent to', trimmedTo)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send customer order confirmation error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send "order paid" email to the customer. Includes CDEK track number when available.
 * No-op if SMTP is not configured.
 */
export async function sendCustomerOrderPaidEmail(
  to: string,
  username: string,
  payload: PaidOrderEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const trimmedTo = to.trim().toLowerCase()
  if (!trimmedTo) return { ok: true }
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; paid email not sent to', trimmedTo)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }
  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })
  const { orderId, total, items, cdekTrackNumber } = payload
  const orderSummary = items
    .map(
      (i) =>
        `${i.title} — ${i.quantity} × ${formatRub(i.price)} = ${formatRub(i.quantity * i.price)}`
    )
    .join('\n')
  const trackLine = cdekTrackNumber?.trim()
    ? `\n\nТрек-номер СДЭК: ${cdekTrackNumber.trim()}`
    : ''
  const text =
    `Inner Health\n\n${username}, ваш заказ оплачен.\n\nID заказа: ${orderId}\n\nСостав заказа:\n${orderSummary}\n\nИтого: ${formatRub(total)}${trackLine}\n\n* Данное письмо создано автоматически, отвечать на него не требуется.`

  const htmlItems = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(i.title)}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatRub(i.quantity * i.price)}</td></tr>`
    )
    .join('')
  const trackHtml = cdekTrackNumber?.trim()
    ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;"><strong>Трек-номер СДЭК:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(cdekTrackNumber.trim())}</span></p>`
    : ''
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Заказ оплачен</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">Inner Health</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">Заказ оплачен</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;"><strong>${escapeHtml(username)}</strong>, ваш заказ оплачен.</p>
              <p style="margin:0 0 16px;font-size:14px;color:#4b5563;"><strong>ID заказа:</strong> ${escapeHtml(orderId)}</p>
              <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#111827;">Состав заказа:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;color:#4b5563;">
                <thead>
                  <tr style="background-color:#f9fafb;">
                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;">Товар</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;">Кол-во</th>
                    <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlItems}
                </tbody>
              </table>
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#0f766e;">Итого: ${formatRub(total)}</p>
              ${trackHtml}
              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">* Данное письмо создано автоматически, отвечать на него не требуется.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
  try {
    console.log('[email] Sending paid email to', trimmedTo)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to: trimmedTo,
      subject: `Заказ ${orderId} оплачен — Inner Health`,
      text,
      html,
    })
    console.log('[email] Paid email sent to', trimmedTo)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send paid email error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send separate admin notification when CDEK track number appears.
 * No-op if SMTP is not configured or toEmails is empty.
 */
export async function sendAdminCdekTrackNotification(
  toEmails: string[],
  payload: PaidOrderEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const unique = Array.from(new Set(toEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)))
  const trackNumber = payload.cdekTrackNumber?.trim()
  if (unique.length === 0 || !trackNumber) return { ok: true }
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; admin CDEK track email not sent')
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }

  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })

  const { orderId, total, shipping } = payload
  const trackingUrl = getCdekTrackingUrl(trackNumber)
  const text =
    `Получен трек-номер СДЭК\n\n` +
    `ID заказа: ${orderId}\n` +
    `Трек-номер СДЭК: ${trackNumber}\n` +
    `Сумма заказа: ${formatRub(total)}\n` +
    `Получатель: ${shipping.fullName}\n` +
    `Телефон: ${shipping.phone}\n` +
    `Email: ${shipping.email}\n` +
    `Отслеживание: ${trackingUrl}\n`
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Трек-номер СДЭК получен</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:26px 28px;background:linear-gradient(135deg,#0f766e 0%,#115e59 100%);">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.82);">Inner Health</div>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.15;font-weight:700;color:#ffffff;">Получен трек СДЭК</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>ID заказа:</strong> ${escapeHtml(orderId)}</p>
              <p style="margin:0 0 20px;font-size:16px;color:#111827;"><strong>Трек-номер СДЭК:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(trackNumber)}</span></p>
              <p style="margin:0 0 20px;font-size:14px;color:#374151;"><strong>Сумма заказа:</strong> ${formatRub(total)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.55;color:#374151;">
                    <p style="margin:0 0 8px;"><strong style="color:#111827;">Получатель:</strong> ${escapeHtml(shipping.fullName)}</p>
                    <p style="margin:0 0 8px;"><strong style="color:#111827;">Телефон:</strong> ${escapeHtml(shipping.phone)}</p>
                    <p style="margin:0;"><strong style="color:#111827;">Email:</strong> ${escapeHtml(shipping.email)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;"><a href="${trackingUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background-color:#0f766e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Открыть отслеживание</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  try {
    console.log('[email] Sending admin CDEK track notification to', unique.join(', '))
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to: unique.join(', '),
      subject: `Трек СДЭК для заказа ${orderId} — Inner Health`,
      text,
      html,
    })
    console.log('[email] Admin CDEK track notification sent')
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send admin CDEK track notification error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send separate customer notification when CDEK track number appears.
 * No-op if SMTP is not configured or email/track are missing.
 */
export async function sendCustomerCdekTrackNotification(
  to: string,
  username: string,
  payload: PaidOrderEmailPayload
): Promise<{ ok: boolean; error?: string }> {
  const trimmedTo = to.trim().toLowerCase()
  const trackNumber = payload.cdekTrackNumber?.trim()
  if (!trimmedTo || !trackNumber) return { ok: true }
  if (!process.env.SMTP_HOST) {
    console.warn('[email] SMTP not configured; customer CDEK track email not sent to', trimmedTo)
    return { ok: false, error: 'Отправка писем не настроена (SMTP_HOST)' }
  }

  const portNum = Number(process.env.SMTP_PORT ?? 587)
  const useSecure = process.env.SMTP_SECURE === 'true'
  const tlsServername = process.env.SMTP_SERVERNAME ?? process.env.SMTP_HOST ?? undefined
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: portNum,
    secure: useSecure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    tls: {
      rejectUnauthorized: true,
      servername: tlsServername,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  })

  const { orderId } = payload
  const trackingUrl = getCdekTrackingUrl(trackNumber)
  const text =
    `Здравствуйте, ${username}.\n\n` +
    `Для заказа ${orderId} получен трек-номер СДЭК: ${trackNumber}\n\n` +
    `Отслеживание: ${trackingUrl}\n\n` +
    `* Данное письмо создано автоматически, отвечать на него не требуется.`
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Трек-номер СДЭК</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:26px 28px;background:linear-gradient(135deg,#0f766e 0%,#115e59 100%);text-align:center;">
              <h1 style="margin:0;font-size:24px;line-height:1.15;font-weight:700;color:#ffffff;">Трек-номер СДЭК получен</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#374151;">${escapeHtml(username)}, ваш заказ передан в СДЭК.</p>
              <p style="margin:0 0 10px;font-size:14px;color:#374151;"><strong>ID заказа:</strong> ${escapeHtml(orderId)}</p>
              <p style="margin:0 0 20px;font-size:16px;color:#111827;"><strong>Трек-номер:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;">${escapeHtml(trackNumber)}</span></p>
              <p style="margin:0 0 24px;"><a href="${trackingUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background-color:#0f766e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Отследить заказ</a></p>
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">* Данное письмо создано автоматически, отвечать на него не требуется.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  try {
    console.log('[email] Sending customer CDEK track notification to', trimmedTo)
    await transporter.sendMail({
      from: SUPPORT_FROM,
      replyTo: REPLY_TO,
      to: trimmedTo,
      subject: `Трек СДЭК для заказа ${orderId} — Inner Health`,
      text,
      html,
    })
    console.log('[email] Customer CDEK track notification sent to', trimmedTo)
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send customer CDEK track notification error:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send order-related emails with a random delay between admin notification and customer confirmation.
 * Runs in background: admin → delay → customer. Reduces burst pattern for better deliverability.
 * Delay range: env EMAIL_SEND_DELAY_MS_MIN / EMAIL_SEND_DELAY_MS_MAX (default 5–15 s; cap 25 min).
 */
export async function sendOrderEmailsWithDelay(
  adminEmails: string[],
  customerEmail: string,
  customerName: string,
  payload: NewOrderEmailPayload
): Promise<void> {
  try {
    if (adminEmails.length > 0) {
      await sendNewOrderNotification(adminEmails, payload)
    }
    const delayMs = getEmailSendDelayMs()
    console.log('[email] Delay before customer order email:', Math.round(delayMs / 1000), 's')
    await sleep(delayMs)
    await sendCustomerOrderConfirmation(customerEmail, customerName, payload)
  } catch (e) {
    console.error('[orders] Order emails error:', e)
  }
}
