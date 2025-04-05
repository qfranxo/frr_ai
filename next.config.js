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
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString()
  },
  experimental: {
    optimizePackageImports: [
      '@clerk/nextjs',
      '@geist-ui/react'
    ]
  }
};

module.exports = nextConfig; 