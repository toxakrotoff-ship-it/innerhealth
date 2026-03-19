import type { MetadataRoute } from 'next'
import { getSiteBaseUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl()
  const adminPath = process.env.ADMIN_SECRET_PATH || 'admin'
  let host: string | undefined
  try {
    host = new URL(baseUrl).host
  } catch {
    host = undefined
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          `/${adminPath}/`,
          '/admin/',
          '/login/',
          '/api/',
          '/debug-table',
          '/debug-',
          '/test-',
          '/simple-test',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    ...(host ? { host } : {}),
  }
}
