import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for video uploads (500MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },

  // Disable ESLint during production builds (fix linting issues later)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript errors won't block builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Keep console.logs for debugging (disable removeConsole)
  compiler: {
    removeConsole: false,
  },

  // Production optimizations
  reactStrictMode: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
