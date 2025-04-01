/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'source.unsplash.com',
      'images.unsplash.com',
      'via.placeholder.com'
    ],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
    ],
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
  }
};

module.exports = nextConfig; 