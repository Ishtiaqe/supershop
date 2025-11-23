/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  swSrc: 'src/sw.js',
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/]
});

module.exports = withPWA(nextConfig);
