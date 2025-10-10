import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove console.logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Production optimizations
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    domains: [
      's3.amazonaws.com',
      process.env.S3_BUCKET_NAME ? `${process.env.S3_BUCKET_NAME}.s3.amazonaws.com` : '',
    ].filter(Boolean),
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

  // Turbopack configuration (for development)
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
