/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
    unoptimized: true,
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

