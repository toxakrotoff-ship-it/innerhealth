import type { MetadataRoute } from 'next'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'

export default function robots(): MetadataRoute.Robots {
  const adminPath = process.env.ADMIN_SECRET_PATH || 'admin'
  const innerUrl = getBrandSiteUrl('inner')
  const sprintUrl = getBrandSiteUrl('sprint-power')

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
    sitemap: [`${innerUrl}/sitemap.xml`, `${sprintUrl}/sitemap.xml`],
  }
}
