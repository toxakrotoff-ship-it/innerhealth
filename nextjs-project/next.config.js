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
    /** Без ресайза; loader только переносит /uploads/* на CDN (NEXT_PUBLIC_CDN_URL). */
    loader: 'custom',
    loaderFile: './src/lib/next-image-cdn-loader.ts',
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

