import nodemailer from 'nodemailer'

const DEFAULT_PUBLIC_URL = 'https://innerhealth.ru'

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
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@localhost',
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
