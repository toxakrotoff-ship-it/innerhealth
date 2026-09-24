import type { NextConfig } from 'next'

/** Catalog HTML: browser always revalidates; ISR still applies on the server until admin busts cache. */
const CATALOG_CACHE_CONTROL =
  'public, max-age=0, must-revalidate'

/** Must match `src/app/admin/layout.tsx` (`ADMIN_SECRET_PATH` or `admin`). */
const ADMIN_UI_PATH = process.env.ADMIN_SECRET_PATH || 'admin'

const ADMIN_NO_STORE =
  'private, no-store, max-age=0, must-revalidate'

const nextConfig: NextConfig = {
  output: 'standalone',
  /** Timeweb CDN для /_next/static/* (build-time). Пусто — статика с origin. */
  ...(process.env.NEXT_PUBLIC_CDN_URL?.trim() && {
    assetPrefix: process.env.NEXT_PUBLIC_CDN_URL.trim().replace(/\/+$/, ''),
  }),
  serverExternalPackages: ['geoip-lite'],
  outputFileTracingIncludes: {
    '/**': ['./node_modules/geoip-lite/data/**'],
  },
  /** При деплое за несколькими инстансами задайте DEPLOYMENT_VERSION для защиты от version skew */
  ...(process.env.DEPLOYMENT_VERSION && {
    deploymentId: process.env.DEPLOYMENT_VERSION,
  }),
  turbopack: {
    root: process.cwd(),
  },
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
    /** Shorter client router cache so storefront updates appear sooner after admin edits. */
    staleTimes: {
      static: 30,
      dynamic: 30,
    },
    /** Длинный TipTap JSON в Server Actions категорий */
    serverActions: {
      bodySizeLimit: '4mb',
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
      {
        source: `/${ADMIN_UI_PATH}`,
        headers: [{ key: 'Cache-Control', value: ADMIN_NO_STORE }],
      },
      {
        source: `/${ADMIN_UI_PATH}/:path*`,
        headers: [{ key: 'Cache-Control', value: ADMIN_NO_STORE }],
      },
    ]
  },
}

export default nextConfig
