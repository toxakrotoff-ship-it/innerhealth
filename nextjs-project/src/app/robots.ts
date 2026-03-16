import type { MetadataRoute } from 'next'

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://innerhaealth.inetrnet.pp.ru'
  )
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()
  const adminPath = process.env.ADMIN_SECRET_PATH || 'admin'

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
  }
}
