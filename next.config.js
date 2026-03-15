/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Changed to enable dynamic SSR for server-rendered dashboard (Option 3)
  output: process.env.NEXT_PUBLIC_OUTPUT === 'export' ? 'export' : undefined,
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  transpilePackages: [
    "antd",
    "@ant-design/icons",
    "@ant-design/icons-svg",
    "rc-util",
    "rc-pagination",
    "rc-picker",
    "rc-tree",
    "rc-table",
  ],
  // headers() is only supported with dynamic output (not 'export')
  // For static export builds, cache control must be set at the hosting level (e.g., Cloudflare, nginx)
  async headers() {
    // Only set headers for non-export builds
    if (process.env.NEXT_PUBLIC_OUTPUT === 'export') {
      // For static export, you MUST configure cache headers in your web server/CDN
      // Example nginx config needed:
      // location ~* manifest\.json$ { add_header Cache-Control "public, max-age=86400"; }
      // location ~* \.(png|jpg|jpeg)$ { add_header Cache-Control "public, max-age=2592000, immutable"; }
      return [];
    }
    return [
      {
        source: '/:all*(svg|jpg|png|jpeg|webp)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, immutable',
          }
        ],
      },
      {
        source: '/:all*(js|css|woff|woff2)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          }
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/:all*(android-chrome|apple-touch)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          }
        ],
      },
    ]
  },
};

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  swSrc: "src/sw.js",
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(withPWA(nextConfig));
