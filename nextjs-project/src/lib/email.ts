import nodemailer from 'nodemailer'

const DEFAULT_PUBLIC_URL = 'https://innerhealth.ru'

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
  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  const { orderId, total, items, shipping, promoCode } = payload
  const itemsLines = items.map(
    (i) => `${i.title} — ${i.quantity} × ${i.price.toFixed(2)} ₽ = ${(i.quantity * i.price).toFixed(2)} ₽`
  )
  const text =
    `Новый заказ на сайте\n\n` +
    `ID заказа: ${orderId}\n` +
    `Сумма: ${total.toFixed(2)} ₽\n\n` +
    `Состав:\n${itemsLines.join('\n')}\n\n` +
    (promoCode ? `Промокод: ${promoCode}\n\n` : '') +
    `Доставка:\n` +
    `ФИО: ${shipping.fullName}\n` +
    `Телефон: ${shipping.phone}\n` +
    `Email: ${shipping.email}\n` +
    `Адрес: ${shipping.address}\n` +
    `Город: ${shipping.city}, ${shipping.zipCode}, ${shipping.country}\n`
  const html = `
    <h2>Новый заказ на сайте</h2>
    <p><strong>ID заказа:</strong> ${escapeHtml(orderId)}</p>
    <p><strong>Сумма:</strong> ${total.toFixed(2)} ₽</p>
    <h3>Состав заказа</h3>
    <ul>
      ${items.map((i) => `<li>${escapeHtml(i.title)} — ${i.quantity} × ${i.price.toFixed(2)} ₽ = ${(i.quantity * i.price).toFixed(2)} ₽</li>`).join('')}
    </ul>
    ${promoCode ? `<p><strong>Промокод:</strong> ${escapeHtml(promoCode)}</p>` : ''}
    <h3>Доставка</h3>
    <ul>
      <li><strong>ФИО:</strong> ${escapeHtml(shipping.fullName)}</li>
      <li><strong>Телефон:</strong> ${escapeHtml(shipping.phone)}</li>
      <li><strong>Email:</strong> ${escapeHtml(shipping.email)}</li>
      <li><strong>Адрес:</strong> ${escapeHtml(shipping.address)}</li>
      <li><strong>Город:</strong> ${escapeHtml(shipping.city)}, ${escapeHtml(shipping.zipCode)}, ${escapeHtml(shipping.country)}</li>
    </ul>
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
  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  const { orderId, total, items } = payload
  const orderSummary = items
    .map(
      (i) =>
        `${i.title} — ${i.quantity} × ${i.price.toFixed(2)} ₽ = ${(i.quantity * i.price).toFixed(2)} ₽`
    )
    .join('\n')
  const orderSummaryHtml = items
    .map(
      (i) =>
        `<tr><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(i.title)}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${i.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${(i.quantity * i.price).toFixed(2)} ₽</td></tr>`
    )
    .join('')
  const text =
    `Вас приветствует Inner Health!\n\n${username}, благодарим за заказ.\n\nСостав заказа:\n${orderSummary}\n\nИтого: ${total.toFixed(2)} ₽\n\n* Данное письмо создано автоматически, отвечать на него не требуется.`
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
              <p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#0f766e;">Итого: ${total.toFixed(2)} ₽</p>
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
