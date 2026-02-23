import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /** Required for Docker: minimal production bundle without full node_modules */
  output: 'standalone',
}

export default nextConfig
