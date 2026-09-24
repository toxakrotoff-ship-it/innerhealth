/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Timeweb CDN для /_next/static/* (build-time). Пусто — статика с origin.
  ...(process.env.NEXT_PUBLIC_CDN_URL?.trim()
    ? { assetPrefix: process.env.NEXT_PUBLIC_CDN_URL.trim().replace(/\/+$/, '') }
    : {}),
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['geoip-lite'],
  outputFileTracingIncludes: {
    '/**': ['./node_modules/geoip-lite/data/**'],
  },
  ...(process.env.DEPLOYMENT_VERSION
    ? { deploymentId: process.env.DEPLOYMENT_VERSION }
    : {}),
  images: {
    /** Только webp: AVIF слишком дорог по CPU для app-контейнера (0.8 CPU). */
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.tildacdn.com',
        pathname: '/**',
      },
    ],
    /**
     * Оптимизатор /_next/image (ресайз + webp) отдаётся с origin. Через CDN — только после того, как в
     * Inner-CDN реально применён учёт query string: иначе CDN отдаёт одну картинку на все url/w (2026-09-24).
     */
  },
  experimental: {
    staleTimes: {
      static: 30,
      dynamic: 30,
    },
  },
  async redirects() {
    return []
  },
  async headers() {
    const CATALOG_CACHE_CONTROL = 'public, max-age=0, must-revalidate'
    return [
      {
        source: '/catalog',
        headers: [{ key: 'Cache-Control', value: CATALOG_CACHE_CONTROL }],
      },
      {
        source: '/catalog/:path*',
        headers: [{ key: 'Cache-Control', value: CATALOG_CACHE_CONTROL }],
      },
    ]
  },
}

module.exports = nextConfig

