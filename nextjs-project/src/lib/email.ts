import nodemailer from 'nodemailer'

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
