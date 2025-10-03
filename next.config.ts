import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove console.logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Webpack config to handle hydration issues
  webpack: (config, { isServer }) => {
    // Only apply on client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
