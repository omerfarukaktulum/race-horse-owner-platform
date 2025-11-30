/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'medya-cdn.tjk.org',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  // Disable automatic scroll restoration to allow manual control
  scrollRestoration: false,
  // Remove console.log in production builds (keep console.error and console.warn)
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      // Client-side production build
      config.optimization = {
        ...config.optimization,
        minimize: true,
      }
    }
    return config
  },
  // Use SWC to remove console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep console.error and console.warn
    } : false,
  },
}

module.exports = nextConfig

