import type { NextConfig } from 'next'

/** Catalog: pre-rendered, fresh 1h, then serve stale while revalidating (ISR). */
const CATALOG_CACHE_CONTROL =
  'public, max-age=3600, stale-while-revalidate=3600'

const nextConfig: NextConfig = {
  output: 'standalone',
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
  },
  experimental: {
    /** Client-side Router Cache: keep cached page payload this long before refetching on navigation */
    staleTimes: {
      static: 300, // 5 min for static/prefetched (e.g. catalog with revalidate)
      dynamic: 30, // 30 s for dynamic segments
    },
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
