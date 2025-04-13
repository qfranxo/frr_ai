/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: [
      'replicate.delivery',
      'zxvbwdwvpaqbuzwbcyse.supabase.co',
      'zxvbwdwvpaqbuzwbcyse.supabase.in',
      'nipdzyfwjqpgojccoqgm.supabase.co',
      'lh3.googleusercontent.com',
      'img.clerk.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  webpack: (config) => {
    return config;
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString()
  },
  experimental: {
    optimizePackageImports: [
      '@clerk/nextjs',
      '@geist-ui/react'
    ]
  },
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig; 