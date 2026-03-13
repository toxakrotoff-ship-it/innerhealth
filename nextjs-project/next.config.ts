import type { NextConfig } from 'next'

/** Catalog: pre-rendered, fresh 1h, then serve stale while revalidating (ISR). */
const CATALOG_CACHE_CONTROL =
  'public, max-age=3600, stale-while-revalidate=3600'

const nextConfig: NextConfig = {
  output: 'standalone',
  /** При деплое за несколькими инстансами задайте DEPLOYMENT_VERSION для защиты от version skew */
  ...(process.env.DEPLOYMENT_VERSION && {
    deploymentId: process.env.DEPLOYMENT_VERSION,
  }),
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.tildacdn.com',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    /** Client-side Router Cache: keep cached page payload this long before refetching on navigation */
    staleTimes: {
      static: 300, // 5 min for static/prefetched (e.g. catalog with revalidate)
      dynamic: 30, // 30 s for dynamic segments
    },
  },
  /** Редиректы со старых URL (Tilda, смена путей) на текущий сайт. Добавляйте пары source → destination. */
  async redirects() {
    const redirects: Array<{ source: string; destination: string; permanent: boolean }> = [
      // Примеры: старые пути Tilda или смена структуры
      // { source: '/page12345678', destination: '/', permanent: true },
      // { source: '/magazin', destination: '/catalog', permanent: true },
      // { source: '/tovar/:slug', destination: '/product/:slug', permanent: true },
    ]
    return redirects
  },
  async headers() {
    return [
      {
        source: '/catalog',
        headers: [
          { key: 'Cache-Control', value: CATALOG_CACHE_CONTROL },
        ],
      },
      {
        source: '/catalog/:path*',
        headers: [
          { key: 'Cache-Control', value: CATALOG_CACHE_CONTROL },
        ],
      },
    ]
  },
}

export default nextConfig
