import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.tildacdn.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
